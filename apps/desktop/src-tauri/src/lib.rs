use tauri::WindowEvent;

const MIGRATIONS: &str = r#"
CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    context TEXT NOT NULL DEFAULT '{}',
    summary TEXT,
    importance_score REAL DEFAULT 0.5
);

CREATE TABLE IF NOT EXISTS memory (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    created_at INTEGER NOT NULL,
    content TEXT NOT NULL,
    memory_type TEXT NOT NULL,
    emotional_tags TEXT,
    importance_score REAL DEFAULT 0.5,
    recall_count INTEGER DEFAULT 0,
    last_recalled_at INTEGER,
    FOREIGN KEY (session_id) REFERENCES session(id)
);

CREATE TABLE IF NOT EXISTS relationship (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    character_id TEXT NOT NULL,
    favorability REAL DEFAULT 50.0,
    trust REAL DEFAULT 50.0,
    total_interactions INTEGER DEFAULT 0,
    last_interaction_at INTEGER,
    created_at INTEGER NOT NULL,
    metadata TEXT
);

CREATE TABLE IF NOT EXISTS emotion_history (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    emotion_state TEXT NOT NULL,
    trigger_type TEXT,
    trigger_intensity REAL
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS character_profile (
    id TEXT PRIMARY KEY,
    profile_data TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memory_type ON memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_memory_importance ON memory(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_memory_created ON memory(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_relationship_user ON relationship(user_id);
CREATE INDEX IF NOT EXISTS idx_emotion_timestamp ON emotion_history(timestamp DESC);
"#;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();
    log::info!("Starting AI Companion...");

    tauri::Builder::default()
        .setup(|_app| {
            log::info!("AI Companion setup complete");
            let _ = _app;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
