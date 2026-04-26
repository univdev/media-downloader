use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SequenceMeta {
    pub name: String,
    pub description: String,
    pub author: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SequenceSelectors {
    pub media: String,
    pub folder_name: Option<String>,
    pub file_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SequenceNaming {
    pub folder: String,
    pub folder_source: String,
    pub file: String,
    pub file_source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Sequence {
    pub version: String,
    pub meta: SequenceMeta,
    pub url_pattern: String,
    pub media_url_pattern: Option<String>,
    pub selectors: SequenceSelectors,
    pub naming: SequenceNaming,
}
