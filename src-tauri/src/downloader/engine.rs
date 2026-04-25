use crate::crawler::fetcher::fetch_page;
use crate::crawler::pattern::{parse_url_pattern, UrlSegment};
use crate::db::{download_repo, media_file_repo};
use crate::downloader::naming;
use crate::models::download::DownloadProgressEvent;
use crate::models::sequence::Sequence;
use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::sync::{Mutex, Semaphore};
use tokio_util::sync::CancellationToken;

const MAX_RETRIES: u32 = 3;
const MAX_CONCURRENT_DOWNLOADS: usize = 3;

pub struct DownloadEngine {
    pub cancel_token: CancellationToken,
}

struct ScannedMedia {
    source_url: String,
    page_url: String,
    media_type: String,
    folder_name: Option<String>,
    file_name_hint: Option<String>,
}

impl DownloadEngine {
    pub fn new() -> Self {
        Self {
            cancel_token: CancellationToken::new(),
        }
    }

    pub async fn run(
        &self,
        app: AppHandle,
        conn: Arc<Mutex<Connection>>,
        download_id: i64,
        sequence: Sequence,
        base_dir: PathBuf,
    ) -> Result<(), String> {
        // Phase A: Scan
        let media_list = self
            .scan_phase(&app, download_id, &sequence)
            .await
            .map_err(|e| e.to_string())?;

        if self.cancel_token.is_cancelled() {
            let c = conn.lock().await;
            let _ = download_repo::update_download_status(&c, download_id, "cancelled", 0, 0, 0);
            return Ok(());
        }

        let total = media_list.len() as u32;

        // Update DB with total count
        {
            let c = conn.lock().await;
            download_repo::update_download_status(&c, download_id, "downloading", total, 0, 0)
                .map_err(|e| e.to_string())?;
        }

        // Insert media files into DB
        {
            let c = conn.lock().await;
            for media in &media_list {
                media_file_repo::insert_media_file(
                    &c,
                    download_id,
                    &media.source_url,
                    &media.page_url,
                    &media.media_type,
                )
                .map_err(|e| e.to_string())?;
            }
        }

        // Determine save directory
        let domain = url::Url::parse(&sequence.url_pattern)
            .map(|u| u.host_str().unwrap_or("unknown").to_string())
            .unwrap_or_else(|_| "unknown".to_string());

        let folder_name_raw = if sequence.naming.folder_source == "selector" {
            media_list
                .first()
                .and_then(|m| m.folder_name.clone())
                .unwrap_or_else(|| sequence.naming.folder.clone())
        } else {
            sequence.naming.folder.clone()
        };

        let domain_dir = base_dir.join("downloaded").join(&domain);
        std::fs::create_dir_all(&domain_dir).map_err(|e| e.to_string())?;
        let folder_name = naming::deduplicate_folder(&domain_dir, &folder_name_raw);
        let save_dir = domain_dir.join(&folder_name);
        std::fs::create_dir_all(&save_dir).map_err(|e| e.to_string())?;

        // Update save_directory in DB
        {
            let c = conn.lock().await;
            c.execute(
                "UPDATE downloads SET save_directory = ?1 WHERE id = ?2",
                rusqlite::params![save_dir.to_string_lossy().to_string(), download_id],
            )
            .map_err(|e| e.to_string())?;
        }

        // Phase B: Download
        let completed = Arc::new(std::sync::atomic::AtomicU32::new(0));
        let failed = Arc::new(std::sync::atomic::AtomicU32::new(0));
        let semaphore = Arc::new(Semaphore::new(MAX_CONCURRENT_DOWNLOADS));
        let download_date = chrono::Local::now().format("%Y-%m-%d").to_string();

        let mut handles = Vec::new();

        for (index, media) in media_list.iter().enumerate() {
            if self.cancel_token.is_cancelled() {
                break;
            }

            let permit = semaphore.clone().acquire_owned().await.map_err(|e| e.to_string())?;
            let app_clone = app.clone();
            let conn_clone = conn.clone();
            let cancel = self.cancel_token.clone();
            let source_url = media.source_url.clone();
            let file_name_hint = media.file_name_hint.clone();
            let save_dir_clone = save_dir.clone();
            let file_pattern = sequence.naming.file.clone();
            let file_source = sequence.naming.file_source.clone();
            let download_date_clone = download_date.clone();
            let completed_clone = completed.clone();
            let failed_clone = failed.clone();

            let handle = tokio::spawn(async move {
                let _permit = permit;

                if cancel.is_cancelled() {
                    return;
                }

                let extension = source_url
                    .rsplit('.')
                    .next()
                    .unwrap_or("bin")
                    .split('?')
                    .next()
                    .unwrap_or("bin")
                    .to_string();

                let file_name = naming::resolve_file_name(
                    &file_pattern,
                    index as u32,
                    &download_date_clone,
                    file_name_hint.as_deref(),
                    &file_source,
                    &extension,
                );

                let file_path = save_dir_clone.join(&file_name);

                let result =
                    download_file_with_retry(&source_url, &file_path, MAX_RETRIES, &cancel).await;

                let c = conn_clone.lock().await;
                // Find media_file id (index + 1 relative to this download's files)
                let files = media_file_repo::list_media_files_by_download(&c, download_id)
                    .unwrap_or_default();
                if let Some(mf) = files.get(index) {
                    match result {
                        Ok(size) => {
                            let _ = media_file_repo::update_media_file_status(
                                &c,
                                mf.id,
                                "completed",
                                Some(&file_path.to_string_lossy()),
                                Some(&file_name),
                                size,
                                0,
                                None,
                            );
                            completed_clone.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                        }
                        Err(e) => {
                            let _ = media_file_repo::update_media_file_status(
                                &c,
                                mf.id,
                                "failed",
                                None,
                                None,
                                0,
                                MAX_RETRIES,
                                Some(&e),
                            );
                            failed_clone.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                        }
                    }
                }

                let current_completed =
                    completed_clone.load(std::sync::atomic::Ordering::Relaxed);
                let current_failed = failed_clone.load(std::sync::atomic::Ordering::Relaxed);

                let _ = app_clone.emit(
                    "download-progress",
                    DownloadProgressEvent {
                        download_id,
                        phase: "downloading".to_string(),
                        current: current_completed + current_failed,
                        total,
                        current_file: Some(file_name),
                        status: "in_progress".to_string(),
                        failed_count: current_failed,
                    },
                );
            });

            handles.push(handle);
        }

        for handle in handles {
            let _ = handle.await;
        }

        let final_completed = completed.load(std::sync::atomic::Ordering::Relaxed);
        let final_failed = failed.load(std::sync::atomic::Ordering::Relaxed);

        let final_status = if self.cancel_token.is_cancelled() {
            "cancelled"
        } else if final_failed > 0 && final_completed == 0 {
            "failed"
        } else {
            "completed"
        };

        {
            let c = conn.lock().await;
            download_repo::update_download_status(
                &c,
                download_id,
                final_status,
                total,
                final_completed,
                final_failed,
            )
            .map_err(|e| e.to_string())?;
        }

        let _ = app.emit(
            "download-progress",
            DownloadProgressEvent {
                download_id,
                phase: "downloading".to_string(),
                current: total,
                total,
                current_file: None,
                status: final_status.to_string(),
                failed_count: final_failed,
            },
        );

        Ok(())
    }

    async fn scan_phase(
        &self,
        app: &AppHandle,
        download_id: i64,
        sequence: &Sequence,
    ) -> Result<Vec<ScannedMedia>, Box<dyn std::error::Error + Send + Sync>> {
        let parsed = parse_url_pattern(&sequence.url_pattern)?;
        let has_open_index = parsed.segments.iter().any(|s| {
            matches!(s, UrlSegment::IndexRange { to: None, .. })
        });

        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .build()?;

        let urls = parsed.generate_urls();
        let mut all_media = Vec::new();

        for (i, url) in urls.iter().enumerate() {
            if self.cancel_token.is_cancelled() {
                break;
            }

            let _ = app.emit(
                "download-progress",
                DownloadProgressEvent {
                    download_id,
                    phase: "scanning".to_string(),
                    current: i as u32 + 1,
                    total: urls.len() as u32,
                    current_file: Some(url.clone()),
                    status: "in_progress".to_string(),
                    failed_count: 0,
                },
            );

            let result = fetch_page(
                &client,
                url,
                &sequence.selectors.media,
                sequence.selectors.folder_name.as_deref(),
                sequence.selectors.file_name.as_deref(),
            )
            .await;

            match result {
                Ok(fetch_result) => {
                    if fetch_result.media_urls.is_empty() && has_open_index {
                        break;
                    }
                    for media_url in fetch_result.media_urls {
                        let media_type = if media_url.contains(".mp4")
                            || media_url.contains(".webm")
                            || media_url.contains(".mov")
                        {
                            "video"
                        } else {
                            "image"
                        };

                        all_media.push(ScannedMedia {
                            source_url: media_url,
                            page_url: fetch_result.page_url.clone(),
                            media_type: media_type.to_string(),
                            folder_name: fetch_result.folder_name.clone(),
                            file_name_hint: fetch_result.file_name_hint.clone(),
                        });
                    }
                }
                Err(_) if has_open_index => {
                    break;
                }
                Err(e) => return Err(e),
            }
        }

        Ok(all_media)
    }
}

async fn download_file_with_retry(
    url: &str,
    path: &std::path::Path,
    max_retries: u32,
    cancel: &CancellationToken,
) -> Result<u64, String> {
    let client = reqwest::Client::new();

    for attempt in 0..=max_retries {
        if cancel.is_cancelled() {
            return Err("Cancelled".to_string());
        }

        match download_single_file(&client, url, path).await {
            Ok(size) => return Ok(size),
            Err(e) if attempt < max_retries => {
                let delay = Duration::from_secs(2u64.pow(attempt));
                tokio::select! {
                    _ = tokio::time::sleep(delay) => continue,
                    _ = cancel.cancelled() => return Err("Cancelled".to_string()),
                }
            }
            Err(e) => return Err(e),
        }
    }

    Err("Max retries exceeded".to_string())
}

async fn download_single_file(
    client: &reqwest::Client,
    url: &str,
    path: &std::path::Path,
) -> Result<u64, String> {
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP {}", response.status()));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Download failed: {}", e))?;

    let size = bytes.len() as u64;
    std::fs::write(path, &bytes).map_err(|e| format!("Write failed: {}", e))?;

    Ok(size)
}
