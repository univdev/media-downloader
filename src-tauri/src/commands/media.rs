use serde::Serialize;

#[derive(Serialize)]
pub struct DownloadPage {
    pub items: Vec<crate::models::download::Download>,
    pub total: u32,
    pub page: u32,
    pub page_size: u32,
}

#[tauri::command]
pub async fn list_downloads(_page: u32, _page_size: u32) -> Result<DownloadPage, String> {
    // TODO: Query from SQLite
    Ok(DownloadPage {
        items: vec![],
        total: 0,
        page: _page,
        page_size: _page_size,
    })
}

#[tauri::command]
pub async fn open_folder(path: String) -> Result<(), String> {
    open::that(&path).map_err(|e| e.to_string())
}
