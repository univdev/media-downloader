use crate::crawler::pattern::apply_captures_with_index_start;
use crate::db::download_repo;
use crate::downloader::engine::DownloadEngine;
use crate::models::sequence::Sequence;
use crate::AppState;
use std::collections::HashMap;
use std::path::PathBuf;
use tauri::{Manager, State};
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

fn sequences_dir(app: &tauri::AppHandle) -> PathBuf {
    let base = app.path().resource_dir().unwrap_or_else(|_| {
        std::env::current_exe()
            .unwrap()
            .parent()
            .unwrap()
            .to_path_buf()
    });
    base.join("sequences")
}

#[tauri::command]
pub async fn start_download_by_url(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    url: String,
) -> Result<i64, String> {
    // 1. 매칭
    let match_result = {
        let index = state.sequence_index.read().await;
        index
            .find_best(&url)
            .ok_or_else(|| "No matching sequence".to_string())?
    };

    // 2. 시퀀스 JSON 로드
    let dir = sequences_dir(&app);
    let file_name = format!(
        "{}.json",
        match_result.sequence_name.replace(' ', "-").to_lowercase()
    );
    let json = std::fs::read_to_string(dir.join(&file_name)).map_err(|e| e.to_string())?;
    let mut sequence: Sequence = serde_json::from_str(&json).map_err(|e| e.to_string())?;

    // 3. 입력 URL에서 추출한 캡처를 실제 탐색 URL 패턴에 적용한다.
    //    원본 매칭 패턴을 입력 URL 한 건으로 덮어쓰면 열린 index 탐색이 사라진다.
    let crawl_pattern = sequence.effective_crawl_url_pattern().to_string();
    let resolved = apply_captures_with_index_start(&crawl_pattern, &match_result.captures)
        .map_err(|e| e.to_string())?;
    sequence.url_pattern = resolved.to_pattern_string();
    sequence.media_url_pattern = None;
    sequence.crawl_url_pattern = None;
    sequence.naming.folder = apply_string_captures(&sequence.naming.folder, &match_result.captures);
    let sequence_json = serde_json::to_string(&sequence).map_err(|e| e.to_string())?;

    // 4. DB insert + engine spawn (기존 start_download 본문 그대로)
    let download_id = {
        let conn = state.db.lock().await;
        download_repo::insert_download(&conn, &sequence.meta.name, &sequence_json, "")
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

fn apply_string_captures(input: &str, captures: &HashMap<String, String>) -> String {
    let mut resolved = input.to_string();
    for (name, value) in captures {
        resolved = resolved.replace(&format!("{{{}}}", name), value);
    }
    resolved
}

#[cfg(test)]
mod tests {
    use super::apply_string_captures;
    use std::collections::HashMap;

    #[test]
    fn apply_string_captures_resolves_folder_tokens() {
        let mut captures = HashMap::new();
        captures.insert("id".to_string(), "3921679".to_string());
        captures.insert("slug".to_string(), "sample-title".to_string());

        assert_eq!(
            apply_string_captures("{slug}-{id}", &captures),
            "sample-title-3921679"
        );
    }
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
