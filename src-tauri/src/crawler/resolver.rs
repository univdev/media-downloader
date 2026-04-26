use super::fetcher::fetch_page;
use super::pattern::{parse_url_pattern, UrlSegment};

pub struct ResolvedMedia {
    pub page_url: String,
    pub media_url: String,
    pub folder_name: Option<String>,
}

pub async fn resolve_urls(
    client: &reqwest::Client,
    url_pattern: &str,
    media_selector: &str,
    folder_selector: Option<&str>,
    on_progress: impl Fn(usize),
) -> Result<Vec<ResolvedMedia>, Box<dyn std::error::Error + Send + Sync>> {
    let parsed = parse_url_pattern(url_pattern)?;
    let has_open_index = parsed.segments.iter().any(|s| {
        matches!(s, UrlSegment::IndexRange { to: None, .. })
    });

    let mut all_media = Vec::new();
    let urls = parsed.generate_urls();

    for (i, url) in urls.iter().enumerate() {
        let result = fetch_page(client, url, media_selector, folder_selector).await;

        match result {
            Ok(fetch_result) => {
                if fetch_result.media_urls.is_empty() && has_open_index {
                    break;
                }
                for media_url in fetch_result.media_urls {
                    all_media.push(ResolvedMedia {
                        page_url: fetch_result.page_url.clone(),
                        media_url,
                        folder_name: fetch_result.folder_name.clone(),
                    });
                }
            }
            Err(_) if has_open_index => {
                break;
            }
            Err(e) => return Err(e),
        }

        on_progress(i + 1);
    }

    Ok(all_media)
}
