use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use std::os::windows::process::CommandExt;
use tauri::{AppHandle, Manager, State};
use screenshots::Screen;

struct DbState {
    conn: Mutex<Connection>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Message {
    id: i64,
    role: String,
    content: String,
    timestamp: i64,
}

#[derive(Debug, Serialize, Deserialize)]
struct EmotionState {
    happiness: i32,
    fatigue: i32,
    loneliness: i32,
    stress: i32,
    affection: i32,
}

#[derive(Debug, Serialize, Deserialize)]
struct Memory {
    id: i64,
    content: String,
    timestamp: i64,
}

fn get_db_path(app: &AppHandle) -> PathBuf {
    let app_dir = app
        .path()
        .app_data_dir()
        .expect("Failed to get app data dir");
    std::fs::create_dir_all(&app_dir).ok();
    app_dir.join("ai_companion.db")
}

fn init_db(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp INTEGER NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS emotion_state (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            happiness INTEGER DEFAULT 50,
            fatigue INTEGER DEFAULT 30,
            loneliness INTEGER DEFAULT 40,
            stress INTEGER DEFAULT 30,
            affection INTEGER DEFAULT 50
        )",
        [],
    )?;

    conn.execute("INSERT OR IGNORE INTO emotion_state (id) VALUES (1)", [])?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            timestamp INTEGER NOT NULL
        )",
        [],
    )?;

    log::info!("[RustDB] Database schema ready");
    Ok(())
}

#[tauri::command]
fn ping(state: State<DbState>) -> String {
    log::info!("[RustDB] ping called!");
    let conn = state.conn.lock().map_err(|e| e.to_string()).unwrap();
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM messages", [], |row| row.get(0))
        .unwrap_or(-1);
    format!("pong ({} messages)", count)
}

#[tauri::command]
fn save_message(state: State<DbState>, role: String, content: String) -> Result<i64, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    log::info!(
        "CHAT_SAVE_ATTEMPT=true CHAT_SAVE_ROLE={} CHAT_SAVE_CONTENT_LENGTH={}",
        role,
        content.chars().count()
    );
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis() as i64;

    conn.execute(
        "INSERT INTO messages (role, content, timestamp) VALUES (?1, ?2, ?3)",
        params![role, content, timestamp],
    )
    .map_err(|e| e.to_string())?;

    let last_id = conn.last_insert_rowid();
    log::info!("CHAT_SAVE_OK=true CHAT_SAVE_ID={}", last_id);
    Ok(last_id)
}

#[tauri::command]
fn load_messages(state: State<DbState>, limit: i64) -> Result<Vec<Message>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    log::info!("CHAT_LOAD_ATTEMPT=true CHAT_LOAD_LIMIT={}", limit);
    let mut stmt = conn
        .prepare(
            "SELECT id, role, content, timestamp FROM (
                SELECT id, role, content, timestamp FROM messages
                ORDER BY timestamp DESC, id DESC
                LIMIT ?1
            ) ORDER BY timestamp ASC, id ASC",
        )
        .map_err(|e| e.to_string())?;

    let messages: Vec<Message> = stmt
        .query_map([limit], |row| {
            Ok(Message {
                id: row.get(0)?,
                role: row.get(1)?,
                content: row.get(2)?,
                timestamp: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    log::info!("CHAT_LOAD_COUNT={}", messages.len());
    Ok(messages)
}

#[tauri::command]
fn save_emotion(
    state: State<DbState>,
    happiness: i32,
    fatigue: i32,
    loneliness: i32,
    stress: i32,
    affection: i32,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE emotion_state SET happiness=?1, fatigue=?2, loneliness=?3, stress=?4, affection=?5 WHERE id=1",
        params![happiness, fatigue, loneliness, stress, affection],
    )
    .map_err(|e| e.to_string())?;

    log::info!("[RustDB] Emotion saved");
    Ok(())
}

#[tauri::command]
fn load_emotion(state: State<DbState>) -> Result<EmotionState, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT happiness, fatigue, loneliness, stress, affection FROM emotion_state WHERE id=1",
        )
        .map_err(|e| e.to_string())?;

    let emotion = stmt
        .query_row([], |row| {
            Ok(EmotionState {
                happiness: row.get(0)?,
                fatigue: row.get(1)?,
                loneliness: row.get(2)?,
                stress: row.get(3)?,
                affection: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(emotion)
}

#[tauri::command]
fn clear_messages(state: State<DbState>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM messages", [])
        .map_err(|e| e.to_string())?;
    log::info!("[RustDB] Messages cleared");
    Ok(())
}

#[tauri::command]
fn save_memory(state: State<DbState>, content: String) -> Result<i64, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis() as i64;

    conn.execute(
        "INSERT INTO memories (content, timestamp) VALUES (?1, ?2)",
        params![content, timestamp],
    )
    .map_err(|e| e.to_string())?;

    let last_id = conn.last_insert_rowid();
    log::info!("[RustDB] Memory saved: {}", content);
    Ok(last_id)
}

#[tauri::command]
fn load_memories(state: State<DbState>) -> Result<Vec<Memory>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, content, timestamp FROM memories ORDER BY timestamp DESC LIMIT 50")
        .map_err(|e| e.to_string())?;

    let memories: Vec<Memory> = stmt
        .query_map([], |row| {
            Ok(Memory {
                id: row.get(0)?,
                content: row.get(1)?,
                timestamp: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    log::info!("[RustDB] Loaded {} memories", memories.len());
    Ok(memories)
}

#[tauri::command]
fn read_photo_dir(path: String) -> Result<Vec<String>, String> {
    log::info!("[RustFS] Reading photo dir: {}", path);
    let entries =
        std::fs::read_dir(&path).map_err(|e| format!("Failed to read directory: {}", e))?;

    let files: Vec<String> = entries
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_file())
        .filter(|e| {
            let name = e.file_name().to_string_lossy().to_lowercase();
            name.ends_with(".jpg")
                || name.ends_with(".jpeg")
                || name.ends_with(".png")
                || name.ends_with(".gif")
                || name.ends_with(".webp")
                || name.ends_with(".bmp")
        })
        .map(|e| e.file_name().to_string_lossy().to_string())
        .collect();

    log::info!("[RustFS] Found {} photos", files.len());
    Ok(files)
}

#[tauri::command]
fn read_file_base64(path: String) -> Result<Vec<u8>, String> {
    log::info!("[RustFS] Reading file: {}", path);
    std::fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn write_binary_file(path: String, data: Vec<u8>) -> Result<(), String> {
    log::info!("[RustFS] Writing binary file: {}", path);
    if let Some(parent) = std::path::Path::new(&path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create dir: {}", e))?;
    }
    std::fs::write(&path, &data).map_err(|e| format!("Failed to write file: {}", e))?;
    log::info!("[RustFS] File written: {} ({} bytes)", path, data.len());
    Ok(())
}

#[tauri::command]
fn capture_screen() -> Result<String, String> {
    log::info!("[RustScreen] Taking screenshot...");
    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;
    if screens.is_empty() {
        return Err("No screens found".to_string());
    }

    let screen = &screens[0];
    let image = screen
        .capture()
        .map_err(|e| format!("Failed to capture: {}", e))?;

    let mut png_bytes: Vec<u8> = Vec::new();
    use image::ImageEncoder;
    let encoder = image::codecs::png::PngEncoder::new(&mut png_bytes);
    encoder
        .write_image(
            &image,
            image.width(),
            image.height(),
            image::ExtendedColorType::Rgba8,
        )
        .map_err(|e| format!("Failed to encode PNG: {}", e))?;

    use base64::Engine;
    let base64_str = base64::engine::general_purpose::STANDARD.encode(&png_bytes);

    log::info!(
        "[RustScreen] Screenshot taken, size: {} bytes",
        base64_str.len()
    );
    Ok(base64_str)
}

// Hermes Agent Commands

static HERMES_PROCESS: AtomicBool = AtomicBool::new(false);

#[tauri::command]
fn hermes_status() -> bool {
    HERMES_PROCESS.load(Ordering::SeqCst)
}

#[tauri::command]
fn hermes_start(hermes_path: String, model: String, api_key: String) -> Result<bool, String> {
    if HERMES_PROCESS.load(Ordering::SeqCst) {
        log::info!("[Hermes] Already running");
        return Ok(true);
    }

    log::info!("[Hermes] Starting subprocess...");
    HERMES_PROCESS.store(true, Ordering::SeqCst);

    // Spawn Hermes in background - Windows hidden window
    let _child = Command::new("python")
        .arg("-c")
        .arg(format!(
            r#"
import sys
import os
sys.path.insert(0, r'{}')
os.chdir(r'{}')
os.environ['MINIMAX_API_KEY'] = r'{}'

from run_agent import AIAgent

agent = AIAgent(
    base_url="https://api.minimax.chat/v1",
    model="{}"
)

print("[HERMES_READY]", flush=True)

while True:
    try:
        line = sys.stdin.readline()
        if not line:
            break
        user_input = line.strip()
        if user_input == "__QUIT__":
            break
        if user_input:
            print(f"[HERMES_PROCESSING]", flush=True)
            response = agent.run_conversation(user_input)
            print(f"[HERMES_RESPONSE]{{response}}[/HERMES_RESPONSE]", flush=True)
            print("[HERMES_DONE]", flush=True)
    except Exception as e:
        print(f"[HERMES_ERROR]{{e}}", flush=True)
        print("[HERMES_DONE]", flush=True)
"#,
            hermes_path.replace("\\", "\\\\"),
            hermes_path.replace("\\", "\\\\"),
            api_key,
            model
        ))
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .creation_flags(0x08000000) // CREATE_NO_WINDOW on Windows
        .spawn();

    log::info!("[Hermes] Subprocess spawned");
    Ok(true)
}

#[tauri::command]
fn hermes_stop() -> Result<(), String> {
    HERMES_PROCESS.store(false, Ordering::SeqCst);
    log::info!("[Hermes] Stopped");
    Ok(())
}

// ========== Web Search Command ==========

#[derive(Debug, Serialize, Deserialize)]
struct SearchResult {
    title: String,
    url: String,
    snippet: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct SearchResponse {
    ok: bool,
    results: Vec<SearchResult>,
    source: String,
    error: Option<String>,
}

#[tauri::command]
fn get_env(name: String) -> Result<String, String> {
    log::info!("[get_env] Getting env: {}", name);
    std::env::var(&name).map_err(|e| format!("Env {} not found: {}", name, e))
}

#[tauri::command]
async fn fetch_url(url: String) -> Result<String, String> {
    log::info!("[fetch_url] Fetching: {}", url);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| format!("Client error: {}", e))?;
    client.get(&url)
        .send()
        .await
        .map_err(|e| format!("Request error: {}", e))?
        .text()
        .await
        .map_err(|e| format!("Read error: {}", e))
}

#[tauri::command]
async fn web_search(query: String, api_key: Option<String>) -> Result<SearchResponse, String> {
    log::info!("[WebSearch] Searching for: {}", query);
    
    // 如果提供了 MiniMax API Key，优先使用 MiniMax MCP 搜索
    // 否则尝试使用 reqwest 调用公共搜索 API
    if let Some(key) = api_key {
        if !key.is_empty() {
            return web_search_minimax(&query, &key).await;
        }
    }
    
    // 尝试使用 reqwest 调用搜索（网络可能受限）
    web_search_fallback(&query).await
}

async fn web_search_minimax(query: &str, api_key: &str) -> Result<SearchResponse, String> {
    log::info!("[WebSearch] Starting MiniMax MCP stdio search for: {}", query);
    
    // Spawn minimax-coding-plan-mcp via uvx with stdio transport
    // API key is passed via MINIMAX_API_KEY environment variable
    
    let mut child = Command::new("C:\\Users\\asus\\AppData\\Roaming\\Python\\Python312\\Scripts\\uvx.exe")
        .args(["minimax-coding-plan-mcp", "-y"])
        .env("MINIMAX_API_KEY", api_key)
        .env("MINIMAX_API_HOST", "https://api.minimax.chat")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .spawn()
        .map_err(|e| format!("Failed to spawn MiniMax MCP: {}. Is uvx installed?", e))?;
    
    let stdin = child.stdin.as_mut()
        .ok_or("Failed to open stdin")?;
    let stdout = child.stdout.as_mut()
        .ok_or("Failed to open stdout")?;
    
    // Send JSON-RPC initialize request first (required by MCP protocol)
    use std::io::{Write, BufRead, BufReader};
    
    let init_request = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 0,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {
                "name": "ai-companion",
                "version": "1.0.0"
            }
        }
    });
    
    let mut request_str = serde_json::to_string(&init_request).map_err(|e| e.to_string())?;
    request_str.push('\n');
    
    stdin.write_all(request_str.as_bytes()).map_err(|e| e.to_string())?;
    stdin.flush().map_err(|e| e.to_string())?;
    
    // Read initialize response
    let mut reader = BufReader::new(stdout);
    let mut init_response = String::new();
    reader.read_line(&mut init_response).map_err(|e| format!("Failed to read init response: {}", e))?;
    
    log::info!("[WebSearch] MCP init response: {}", &init_response[..init_response.len().min(200)]);
    
    // Send initialized notification (required by MCP)
    let notif = serde_json::json!({
        "jsonrpc": "2.0",
        "method": "notifications/initialized",
        "params": {}
    });
    request_str = serde_json::to_string(&notif).map_err(|e| e.to_string())?;
    request_str.push('\n');
    stdin.write_all(request_str.as_bytes()).map_err(|e| e.to_string())?;
    stdin.flush().map_err(|e| e.to_string())?;
    
    // Now send tools/list to verify
    let list_request = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/list",
        "params": {}
    });
    request_str = serde_json::to_string(&list_request).map_err(|e| e.to_string())?;
    request_str.push('\n');
    stdin.write_all(request_str.as_bytes()).map_err(|e| e.to_string())?;
    stdin.flush().map_err(|e| e.to_string())?;
    
    // Read tools/list response
    let mut tools_response = String::new();
    reader.read_line(&mut tools_response).map_err(|e| format!("Failed to read tools list: {}", e))?;
    
    log::info!("[WebSearch] MCP tools list: {}", &tools_response[..tools_response.len().min(300)]);
    
    // Now send the actual web_search request
    let search_request = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {
            "name": "web_search",
            "arguments": {
                "query": query
            }
        }
    });
    
    request_str = serde_json::to_string(&search_request).map_err(|e| e.to_string())?;
    request_str.push('\n');
    
    stdin.write_all(request_str.as_bytes()).map_err(|e| e.to_string())?;
    stdin.flush().map_err(|e| e.to_string())?;
    
    // Read search response
    let mut search_response = String::new();
    reader.read_line(&mut search_response).map_err(|e| format!("Failed to read search response: {}", e))?;
    
    log::info!("[WebSearch] MCP search response received, length: {}", search_response.len());
    
    // Parse JSON-RPC response
    #[derive(Deserialize)]
    struct JsonRpcResponse {
        #[serde(default)]
        result: Option<serde_json::Value>,
        #[serde(default)]
        error: Option<serde_json::Value>,
    }
    
    let rpc_resp: JsonRpcResponse = serde_json::from_str(&search_response)
        .map_err(|e| format!("Failed to parse MCP response: {} - raw: {}", e, &search_response[..search_response.len().min(500)]))?;
    
    // Parse search results from result
    let results_value = rpc_resp.result
        .ok_or_else(|| format!("MCP error: {:?}. Raw: {}", rpc_resp.error, &search_response[..search_response.len().min(300)]))?;
    
    // Extract results array - MCP returns content array with text containing JSON
    let content = results_value.get("content")
        .and_then(|c| c.as_array())
        .ok_or("MCP response missing content array")?;
    
    let mut search_results: Vec<SearchResult> = Vec::new();
    for item in content {
        if let Some(text) = item.get("text").and_then(|t| t.as_str()) {
            // The text is a JSON string containing { "organic": [...], "base_resp": {...} }
            #[derive(Deserialize)]
            struct MCPResults {
                organic: Option<Vec<MCPSearchResult>>,
                base_resp: Option<BaseResp>,
            }
            #[derive(Deserialize)]
            struct MCPSearchResult {
                title: String,
                link: String,
                snippet: String,
                #[serde(default)]
                date: String,
            }
            #[derive(Deserialize)]
            struct BaseResp {
                status_code: i32,
                #[serde(default)]
                status_msg: String,
            }
            
            if let Ok(parsed) = serde_json::from_str::<MCPResults>(text) {
                if let Some(organic) = parsed.organic {
                    for r in organic {
                        search_results.push(SearchResult {
                            title: r.title,
                            url: r.link,
                            snippet: r.snippet,
                        });
                    }
                }
                // Check if search was successful
                if let Some(base) = parsed.base_resp {
                    if base.status_code != 0 {
                        log::warn!("[WebSearch] MCP returned status_code={}", base.status_code);
                    }
                }
                break;
            }
        }
    }
    
    log::info!("[WebSearch] Parsed {} search results", search_results.len());
    
    // Kill the MCP process
    child.kill().ok();
    let _ = child.wait();
    
    if search_results.is_empty() {
        Ok(SearchResponse {
            ok: false,
            results: vec![],
            source: "minimax_mcp_stdio".to_string(),
            error: Some(format!("MCP returned {} results but none could be parsed", content.len())),
        })
    } else {
        Ok(SearchResponse {
            ok: true,
            results: search_results,
            source: "minimax_mcp_stdio".to_string(),
            error: None,
        })
    }
}

async fn bing_search(client: &reqwest::Client, query: &str, api_key: &str) -> Result<SearchResponse, String> {
    log::info!("[WebSearch] Using Bing Search API");
    
    let url = format!(
        "https://api.bing.microsoft.com/v7.0/search?q={}&count=5&responseFilter=WebPages",
        urlencoding::encode(query)
    );
    
    let response = client
        .get(&url)
        .header("Ocp-Apim-Subscription-Key", api_key)
        .send()
        .await
        .map_err(|e| format!("Bing API request failed: {}", e))?;
    
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Ok(SearchResponse {
            ok: false,
            results: vec![],
            source: "bing".to_string(),
            error: Some(format!("Bing API error {}: {}", status, body)),
        });
    }
    
    #[derive(Deserialize)]
    struct BingResponse {
        webPages: Option<WebPages>,
    }
    
    #[derive(Deserialize)]
    struct WebPages {
        value: Option<Vec<BingResult>>,
    }
    
    #[derive(Deserialize)]
    struct BingResult {
        name: String,
        url: String,
        snippet: String,
    }
    
    let bing_resp: BingResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Bing response: {}", e))?;
    
    let results: Vec<SearchResult> = bing_resp
        .webPages
        .and_then(|wp| wp.value)
        .unwrap_or_default()
        .into_iter()
        .take(5)
        .map(|r| SearchResult {
            title: r.name,
            url: r.url,
            snippet: r.snippet,
        })
        .collect();
    
    log::info!("[WebSearch] Bing returned {} results", results.len());
    
    Ok(SearchResponse {
        ok: true,
        results,
        source: "bing".to_string(),
        error: None,
    })
}

async fn web_search_fallback(query: &str) -> Result<SearchResponse, String> {
    log::info!("[WebSearch] Trying fallback search methods");
    
    // 尝试使用 MiniMax MCP 工具（如果有 MCP server）
    // 由于 MCP server 是独立进程，这里返回 NOT_CONFIGURED
    
    Ok(SearchResponse {
        ok: false,
        results: vec![],
        source: "fallback".to_string(),
        error: Some("BLOCKED_API_CONFIG: No search API available. Options: 1) Set BING_API_KEY environment variable, 2) Use MiniMax MCP search tool in browser, 3) Implement custom search backend.".to_string()),
    })
}

// URL encoding helper
mod urlencoding {
    pub fn encode(input: &str) -> String {
        let mut result = String::new();
        for byte in input.bytes() {
            match byte {
                b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                    result.push(byte as char);
                }
                _ => {
                    result.push_str(&format!("%{:02X}", byte));
                }
            }
        }
        result
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();
    log::info!("Starting AI Companion with Rust SQLite Runtime...");

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let db_path = get_db_path(app.handle());
            log::info!("[RustDB] Database path: {:?}", db_path);
            log::info!("CHAT_DB_PATH={}", db_path.display());

            let conn = Connection::open(&db_path).expect("Failed to open database");
            init_db(&conn).expect("Failed to init database schema");

            app.manage(DbState {
                conn: Mutex::new(conn),
            });

            log::info!("AI Companion setup complete with Rust SQLite backend");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_env,
            fetch_url,
            ping,
            save_message,
            load_messages,
            save_emotion,
            load_emotion,
            clear_messages,
            save_memory,
            load_memories,
            read_photo_dir,
            read_file_base64,
            write_binary_file,
            capture_screen,
            hermes_status,
            hermes_start,
            hermes_stop,
            web_search
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
