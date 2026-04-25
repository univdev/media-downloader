use crate::models::download::DownloadProgressEvent;
use tauri::{AppHandle, Emitter};

pub fn emit_progress(app: &AppHandle, event: &DownloadProgressEvent) {
    let _ = app.emit("download-progress", event);
}
