mod commands;
mod crawler;
mod db;
mod downloader;
mod models;

use commands::{download, media, sequence};
use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::Manager;
use tokio::sync::Mutex;

pub struct AppState {
    pub db: Arc<Mutex<Connection>>,
    pub base_dir: PathBuf,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let base_dir = app
                .path()
                .resource_dir()
                .unwrap_or_else(|_| {
                    std::env::current_exe()
                        .unwrap()
                        .parent()
                        .unwrap()
                        .to_path_buf()
                });

            let db_path = base_dir.join("media-downloader.db");
            let conn = Connection::open(&db_path).expect("Failed to open database");
            db::schema::initialize(&conn).expect("Failed to initialize database schema");

            app.manage(AppState {
                db: Arc::new(Mutex::new(conn)),
                base_dir,
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            sequence::create_sequence,
            sequence::list_sequences,
            sequence::get_sequence,
            sequence::delete_sequence,
            sequence::validate_sequence,
            download::start_download,
            download::cancel_download,
            media::list_downloads,
            media::open_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
