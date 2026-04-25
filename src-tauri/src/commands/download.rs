use tauri::AppHandle;

#[tauri::command]
pub async fn start_download(_app: AppHandle, _sequence_json: String) -> Result<i64, String> {
    // TODO: Implement download engine integration
    Err("Not yet implemented".to_string())
}

#[tauri::command]
pub async fn cancel_download(_download_id: i64) -> Result<(), String> {
    // TODO: Implement cancellation via CancellationToken
    Err("Not yet implemented".to_string())
}
