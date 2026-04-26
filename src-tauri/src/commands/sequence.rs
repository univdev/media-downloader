use crate::models::sequence::{Sequence, SequenceMeta};
use crate::sequence_index::MatchResult;
use crate::AppState;
use std::fs;
use std::path::PathBuf;
use tauri::{Manager, State};

fn sequences_dir(app: &tauri::AppHandle) -> PathBuf {
    let base = app
        .path()
        .resource_dir()
        .unwrap_or_else(|_| std::env::current_exe().unwrap().parent().unwrap().to_path_buf());
    base.join("sequences")
}

#[tauri::command]
pub async fn create_sequence(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    json: String,
) -> Result<String, String> {
    let seq: Sequence = serde_json::from_str(&json).map_err(|e| e.to_string())?;

    let trimmed_name = seq.meta.name.trim();
    if trimmed_name.is_empty() {
        return Err("Sequence name cannot be empty".to_string());
    }
    if trimmed_name.contains(['\\', '/', ':', '*', '?', '"', '<', '>', '|']) {
        return Err("Sequence name contains invalid characters".to_string());
    }

    let dir = sequences_dir(&app);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let file_name = format!("{}.json", trimmed_name.replace(' ', "-").to_lowercase());
    let path = dir.join(&file_name);
    fs::write(&path, &json).map_err(|e| e.to_string())?;

    state.sequence_index.write().await.upsert(&seq);

    Ok(file_name)
}

#[tauri::command]
pub async fn list_sequences(app: tauri::AppHandle) -> Result<Vec<SequenceMeta>, String> {
    let dir = sequences_dir(&app);
    if !dir.exists() {
        return Ok(vec![]);
    }

    let mut metas = Vec::new();
    let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().is_some_and(|ext| ext == "json") {
            if let Ok(content) = fs::read_to_string(&path) {
                if let Ok(seq) = serde_json::from_str::<Sequence>(&content) {
                    metas.push(seq.meta);
                }
            }
        }
    }

    Ok(metas)
}

#[tauri::command]
pub async fn get_sequence(app: tauri::AppHandle, name: String) -> Result<String, String> {
    let dir = sequences_dir(&app);
    let file_name = format!("{}.json", name.replace(' ', "-").to_lowercase());
    let path = dir.join(&file_name);
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_sequence(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    name: String,
) -> Result<(), String> {
    let dir = sequences_dir(&app);
    let file_name = format!("{}.json", name.replace(' ', "-").to_lowercase());
    let path = dir.join(&file_name);
    fs::remove_file(&path).map_err(|e| e.to_string())?;

    state.sequence_index.write().await.remove(&name);

    Ok(())
}

#[tauri::command]
pub async fn validate_sequence(json: String) -> Result<bool, String> {
    match serde_json::from_str::<Sequence>(&json) {
        Ok(_) => Ok(true),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn find_sequence_by_url(
    state: State<'_, AppState>,
    url: String,
) -> Result<Option<MatchResult>, String> {
    let index = state.sequence_index.read().await;
    Ok(index.find_best(&url))
}
