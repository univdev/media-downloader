use scraper::{Html, Selector};

pub struct FetchResult {
    pub page_url: String,
    pub media_urls: Vec<String>,
    pub folder_name: Option<String>,
    pub file_name_hint: Option<String>,
}

pub async fn fetch_page(
    client: &reqwest::Client,
    url: &str,
    media_selector: &str,
    folder_selector: Option<&str>,
    file_selector: Option<&str>,
) -> Result<FetchResult, Box<dyn std::error::Error + Send + Sync>> {
    let response = client.get(url).send().await?;

    if !response.status().is_success() {
        return Err(format!("HTTP {}", response.status()).into());
    }

    let html_text = response.text().await?;
    let document = Html::parse_document(&html_text);

    let sel =
        Selector::parse(media_selector).map_err(|e| format!("Invalid selector: {:?}", e))?;

    let base_url = url::Url::parse(url)?;
    let mut media_urls = Vec::new();

    for element in document.select(&sel) {
        if let Some(src) = element.value().attr("src").or_else(|| element.value().attr("data-src"))
        {
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

    let file_name_hint = file_selector.and_then(|s| {
        Selector::parse(s)
            .ok()
            .and_then(|sel| document.select(&sel).next())
            .map(|el| el.text().collect::<String>().trim().to_string())
    });

    Ok(FetchResult {
        page_url: url.to_string(),
        media_urls,
        folder_name,
        file_name_hint,
    })
}
