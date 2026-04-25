use crate::db::download_repo;
use crate::downloader::engine::DownloadEngine;
use crate::models::sequence::Sequence;
use crate::AppState;
use std::collections::HashMap;
use tauri::State;
use tokio::sync::Mutex;

struct DownloadManager {
    engines: HashMap<i64, DownloadEngine>,
}

impl DownloadManager {
    fn new() -> Self {
        Self {
            engines: HashMap::new(),
        }
    }
}

static DOWNLOAD_MANAGER: std::sync::LazyLock<Mutex<DownloadManager>> =
    std::sync::LazyLock::new(|| Mutex::new(DownloadManager::new()));

#[tauri::command]
pub async fn start_download(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    sequence_json: String,
) -> Result<i64, String> {
    let sequence: Sequence =
        serde_json::from_str(&sequence_json).map_err(|e| e.to_string())?;

    let download_id = {
        let conn = state.db.lock().await;
        download_repo::insert_download(
            &conn,
            &sequence.meta.name,
            &sequence_json,
            "",
        )
        .map_err(|e| e.to_string())?
    };

    let engine = DownloadEngine::new();
    let cancel_token = engine.cancel_token.clone();

    {
        let mut manager = DOWNLOAD_MANAGER.lock().await;
        manager.engines.insert(download_id, DownloadEngine::new());
        // Overwrite with the engine whose cancel_token we hold
        if let Some(e) = manager.engines.get_mut(&download_id) {
            e.cancel_token = cancel_token.clone();
        }
    }

    let db = state.db.clone();
    let base_dir = state.base_dir.clone();

    tokio::spawn(async move {
        let engine = DownloadEngine { cancel_token };
        let result = engine.run(app, db, download_id, sequence, base_dir).await;
        if let Err(e) = result {
            eprintln!("Download {} failed: {}", download_id, e);
        }

        let mut manager = DOWNLOAD_MANAGER.lock().await;
        manager.engines.remove(&download_id);
    });

    Ok(download_id)
}

#[tauri::command]
pub async fn cancel_download(download_id: i64) -> Result<(), String> {
    let manager = DOWNLOAD_MANAGER.lock().await;
    if let Some(engine) = manager.engines.get(&download_id) {
        engine.cancel_token.cancel();
        Ok(())
    } else {
        Err("Download not found or already completed".to_string())
    }
}
