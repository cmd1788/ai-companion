use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
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
    log::info!("[RustDB] Message saved id={}", last_id);
    Ok(last_id)
}

#[tauri::command]
fn load_messages(state: State<DbState>, limit: i64) -> Result<Vec<Message>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, role, content, timestamp FROM messages ORDER BY timestamp ASC LIMIT ?1",
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

    log::info!("[RustDB] Loaded {} messages", messages.len());
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
fn take_screenshot() -> Result<String, String> {
    log::info!("[RustScreen] Taking screenshot...");
    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;
    if screens.is_empty() {
        return Err("No screens found".to_string());
    }

    let screen = &screens[0];
    let image = screen.capture().map_err(|e| format!("Failed to capture: {}", e))?;

    let mut png_bytes: Vec<u8> = Vec::new();
    use image::ImageEncoder;
    let encoder = image::codecs::png::PngEncoder::new(&mut png_bytes);
    encoder.write_image(
        &image,
        image.width(),
        image.height(),
        image::ExtendedColorType::Rgba8,
    )
    .map_err(|e| format!("Failed to encode PNG: {}", e))?;

    use base64::Engine;
    let base64_str = base64::engine::general_purpose::STANDARD.encode(&png_bytes);

    log::info!("[RustScreen] Screenshot taken, size: {} bytes", base64_str.len());
    Ok(base64_str)
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

            let conn = Connection::open(&db_path).expect("Failed to open database");
            init_db(&conn).expect("Failed to init database schema");

            app.manage(DbState {
                conn: Mutex::new(conn),
            });

            log::info!("AI Companion setup complete with Rust SQLite backend");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
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
            take_screenshot
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
