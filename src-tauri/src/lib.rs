mod commands;
mod crawler;
mod db;
mod downloader;
mod models;
mod sequence_index;

use commands::{download, html_fetch, media, sequence, window};
use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::Manager;
use tokio::sync::{Mutex, RwLock};

pub struct AppState {
    pub db: Arc<Mutex<Connection>>,
    pub base_dir: PathBuf,
    pub sequence_index: Arc<RwLock<crate::sequence_index::SequenceIndex>>,
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

            let sequences_dir = base_dir.join("sequences");
            let index = sequence_index::SequenceIndex::build(&sequences_dir);

            app.manage(AppState {
                db: Arc::new(Mutex::new(conn)),
                base_dir,
                sequence_index: Arc::new(RwLock::new(index)),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            sequence::create_sequence,
            sequence::list_sequences,
            sequence::get_sequence,
            sequence::delete_sequence,
            sequence::validate_sequence,
            sequence::find_sequence_by_url,
            download::start_download_by_url,
            download::cancel_download,
            media::list_downloads,
            media::open_folder,
            window::open_sequence_editor,
            window::open_selector_picker,
            window::close_window,
            html_fetch::fetch_html,
            html_fetch::prettify_html,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
