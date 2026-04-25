use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Download {
    pub id: i64,
    pub sequence_name: String,
    pub sequence_json: String,
    pub status: String,
    pub total_files: u32,
    pub completed_files: u32,
    pub failed_files: u32,
    pub save_directory: String,
    pub started_at: Option<String>,
    pub finished_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgressEvent {
    pub download_id: i64,
    pub phase: String,
    pub current: u32,
    pub total: u32,
    pub current_file: Option<String>,
    pub status: String,
    pub failed_count: u32,
}
