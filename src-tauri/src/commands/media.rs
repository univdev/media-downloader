use crate::db::download_repo;
use crate::models::download::Download;
use crate::AppState;
use serde::Serialize;
use tauri::State;

#[derive(Serialize)]
pub struct DownloadPage {
    pub items: Vec<Download>,
    pub total: u32,
    pub page: u32,
    pub page_size: u32,
}

#[tauri::command]
pub async fn list_downloads(
    state: State<'_, AppState>,
    page: u32,
    page_size: u32,
) -> Result<DownloadPage, String> {
    let conn = state.db.lock().await;
    let (items, total) =
        download_repo::list_downloads(&conn, page, page_size).map_err(|e| e.to_string())?;

    Ok(DownloadPage {
        items,
        total,
        page,
        page_size,
    })
}

#[tauri::command]
pub async fn open_folder(path: String) -> Result<(), String> {
    open::that(&path).map_err(|e| e.to_string())
}
