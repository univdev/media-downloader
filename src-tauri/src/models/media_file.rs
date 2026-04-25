use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaFile {
    pub id: i64,
    pub download_id: i64,
    pub source_url: String,
    pub page_url: String,
    pub file_path: Option<String>,
    pub file_name: Option<String>,
    pub file_size: u64,
    pub media_type: String,
    pub status: String,
    pub retry_count: u32,
    pub error_message: Option<String>,
    pub created_at: String,
}
