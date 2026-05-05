use crate::commands::html_fetch::render_page_payload;
use scraper::{Html, Selector};

#[derive(Clone)]
pub struct FetchResult {
    pub page_url: String,
    pub media_urls: Vec<String>,
    pub folder_name: Option<String>,
}

pub async fn fetch_page(
    client: &reqwest::Client,
    url: &str,
    media_selector: &str,
    folder_selector: Option<&str>,
) -> Result<FetchResult, Box<dyn std::error::Error + Send + Sync>> {
    let raw_result = fetch_raw_page(client, url, media_selector, folder_selector).await;

    if let Ok(result) = raw_result.as_ref() {
        if !result.media_urls.is_empty() {
            return Ok(FetchResult {
                page_url: result.page_url.clone(),
                media_urls: result.media_urls.clone(),
                folder_name: result.folder_name.clone(),
            });
        }
    }

    let rendered = render_page_payload(url, false).await?;
    let rendered_result = parse_fetch_result(url, &rendered.html, media_selector, folder_selector)?;
    if !rendered_result.media_urls.is_empty() {
        return Ok(rendered_result);
    }

    Ok(rendered_result)
}

async fn fetch_raw_page(
    client: &reqwest::Client,
    url: &str,
    media_selector: &str,
    folder_selector: Option<&str>,
) -> Result<FetchResult, Box<dyn std::error::Error + Send + Sync>> {
    let response = client.get(url).send().await?;

    if !response.status().is_success() {
        return Err(format!("HTTP {}", response.status()).into());
    }

    let html_text = response.text().await?;
    parse_fetch_result(url, &html_text, media_selector, folder_selector)
}

fn parse_fetch_result(
    url: &str,
    html_text: &str,
    media_selector: &str,
    folder_selector: Option<&str>,
) -> Result<FetchResult, Box<dyn std::error::Error + Send + Sync>> {
    let document = Html::parse_document(html_text);

    let sel = Selector::parse(media_selector)
        .map_err(|e| format!("Invalid selector: {:?}", e))?;

    let base_url = url::Url::parse(url)?;
    let mut media_urls = Vec::new();

    for element in document.select(&sel) {
        let value = element.value();
        let source = value
            .attr("src")
            .or_else(|| value.attr("data-src"))
            .or_else(|| value.attr("href"));
        if let Some(src) = source {
            let absolute = base_url.join(src)?.to_string();
            media_urls.push(absolute);
        }
    }

    let folder_name = folder_selector.and_then(|s| {
        Selector::parse(s)
            .ok()
            .and_then(|sel| document.select(&sel).next())
            .map(|el| el.text().collect::<String>().trim().to_string())
    });

    Ok(FetchResult {
        page_url: url.to_string(),
        media_urls,
        folder_name,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_fetch_result_extracts_rendered_img_src() {
        let html = r#"
            <html>
              <body>
                <div id="comicImages">
                  <picture><img class="lillie" src="/media/page.avif" /></picture>
                </div>
              </body>
            </html>
        "#;

        let result = parse_fetch_result(
            "https://example.test/reader/1.html#1-",
            html,
            "#comicImages > picture > img.lillie",
            None,
        )
        .expect("selector should parse");

        assert_eq!(
            result.media_urls,
            vec!["https://example.test/media/page.avif".to_string()]
        );
    }

    #[test]
    fn parse_fetch_result_supports_href_media_sources() {
        let html = r#"<html><body><a class="download" href="image.webp">open</a></body></html>"#;

        let result = parse_fetch_result(
            "https://example.test/gallery/",
            html,
            "a.download",
            None,
        )
        .expect("selector should parse");

        assert_eq!(
            result.media_urls,
            vec!["https://example.test/gallery/image.webp".to_string()]
        );
    }
}
