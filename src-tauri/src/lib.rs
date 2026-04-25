mod commands;
mod crawler;
mod db;
mod downloader;
mod models;

use commands::{download, media, sequence};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
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
