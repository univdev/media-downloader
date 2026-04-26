use std::collections::HashSet;
use std::path::Path;

pub fn resolve_folder_name(pattern: &str, selector_text: Option<&str>, source: &str) -> String {
    match source {
        "selector" => selector_text
            .map(sanitize_filename)
            .unwrap_or_else(|| pattern.to_string()),
        _ => pattern.to_string(),
    }
}

pub fn deduplicate_folder(base_dir: &Path, name: &str) -> String {
    if !base_dir.join(name).exists() {
        return name.to_string();
    }

    let mut i = 1;
    loop {
        let candidate = format!("{}_{}", name, i);
        if !base_dir.join(&candidate).exists() {
            return candidate;
        }
        i += 1;
    }
}

/// Extract `(stem, ext)` from the last path segment of a media URL.
/// - Strips query string and fragment via `url::Url`.
/// - Percent-decodes the segment (e.g. `%ED%95%9C%EA%B8%80` -> `한글`).
/// - Sanitizes filesystem-unsafe characters.
/// - Falls back to `("file", "bin")` when the URL has no usable path segment.
/// - Falls back to `(name, "bin")` when no extension is present.
pub fn extract_basename(media_url: &str) -> (String, String) {
    // 1. Parse URL → take last non-empty path segment.
    let raw_segment = url::Url::parse(media_url)
        .ok()
        .and_then(|u| {
            u.path_segments()
                .and_then(|segs| segs.filter(|s| !s.is_empty()).last().map(String::from))
        });

    let raw = match raw_segment {
        Some(s) => s,
        None => return ("file".to_string(), "bin".to_string()),
    };

    // 2. Percent decode.
    let decoded = urlencoding::decode(&raw)
        .map(|c| c.into_owned())
        .unwrap_or(raw);

    // 3. Sanitize filesystem-unsafe characters.
    let sanitized = sanitize_filename(&decoded);
    if sanitized.is_empty() {
        return ("file".to_string(), "bin".to_string());
    }

    // 4. Split into (stem, ext) on the last '.'.
    match sanitized.rsplit_once('.') {
        Some((stem, ext)) if !stem.is_empty() && !ext.is_empty() => {
            (stem.to_string(), ext.to_string())
        }
        _ => (sanitized, "bin".to_string()),
    }
}

/// Pick a unique `"{stem}.{ext}"` filename.
/// On collision, appends `_001`, `_002`, ... suffix to `stem`.
/// The chosen name is inserted into `used` so subsequent calls deduplicate against it.
pub fn dedupe_basename(stem: &str, ext: &str, used: &mut HashSet<String>) -> String {
    let candidate = format!("{}.{}", stem, ext);
    if used.insert(candidate.clone()) {
        return candidate;
    }
    let mut i: u32 = 1;
    loop {
        let c = format!("{}_{:03}.{}", stem, i, ext);
        if used.insert(c.clone()) {
            return c;
        }
        i += 1;
    }
}

/// Resolve final filename for a media URL.
///
/// Combines [`extract_basename`] (URL → stem/ext) with [`dedupe_basename`]
/// (collision avoidance scoped to the caller-provided `used` set).
pub fn resolve_file_name(media_url: &str, used: &mut HashSet<String>) -> String {
    let (stem, ext) = extract_basename(media_url);
    dedupe_basename(&stem, &ext, used)
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            _ => c,
        })
        .collect::<String>()
        .trim()
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deduplicate_folder_no_conflict() {
        let dir = std::env::temp_dir();
        let name = "nonexistent_test_folder_12345";
        assert_eq!(deduplicate_folder(&dir, name), name);
    }

    #[test]
    fn test_sanitize_filename_special_chars() {
        assert_eq!(sanitize_filename("hello/world:test"), "hello_world_test");
    }

    #[test]
    fn test_extract_basename_simple() {
        let (stem, ext) = extract_basename("https://x.com/path/photo.jpg");
        assert_eq!(stem, "photo");
        assert_eq!(ext, "jpg");
    }

    #[test]
    fn test_extract_basename_strips_query_string() {
        let (stem, ext) = extract_basename("https://x.com/img.jpg?token=123&v=2");
        assert_eq!(stem, "img");
        assert_eq!(ext, "jpg");
    }

    #[test]
    fn test_extract_basename_strips_fragment() {
        let (stem, ext) = extract_basename("https://x.com/file.png#anchor");
        assert_eq!(stem, "file");
        assert_eq!(ext, "png");
    }

    #[test]
    fn test_extract_basename_percent_decode_korean() {
        // %ED%95%9C%EA%B8%80.jpg -> 한글.jpg
        let (stem, ext) =
            extract_basename("https://x.com/%ED%95%9C%EA%B8%80.jpg");
        assert_eq!(stem, "한글");
        assert_eq!(ext, "jpg");
    }

    #[test]
    fn test_extract_basename_empty_path() {
        let (stem, ext) = extract_basename("https://x.com/");
        assert_eq!(stem, "file");
        assert_eq!(ext, "bin");
    }

    #[test]
    fn test_extract_basename_no_path() {
        let (stem, ext) = extract_basename("https://x.com");
        assert_eq!(stem, "file");
        assert_eq!(ext, "bin");
    }

    #[test]
    fn test_extract_basename_no_extension() {
        let (stem, ext) = extract_basename("https://x.com/somefile");
        assert_eq!(stem, "somefile");
        assert_eq!(ext, "bin");
    }

    #[test]
    fn test_extract_basename_invalid_url_falls_back() {
        let (stem, ext) = extract_basename("not a url");
        assert_eq!(stem, "file");
        assert_eq!(ext, "bin");
    }

    #[test]
    fn test_extract_basename_unicode_non_ascii() {
        let (stem, ext) = extract_basename("https://x.com/사진.png");
        assert_eq!(stem, "사진");
        assert_eq!(ext, "png");
    }

    #[test]
    fn test_extract_basename_dot_only_filename() {
        // ".env" → stem empty, treated as no extension fallback
        let (stem, ext) = extract_basename("https://x.com/.env");
        assert_eq!(stem, ".env");
        assert_eq!(ext, "bin");
    }

    #[test]
    fn test_dedupe_basename_first_wins() {
        let mut used: HashSet<String> = HashSet::new();
        let name = dedupe_basename("photo", "jpg", &mut used);
        assert_eq!(name, "photo.jpg");
        assert!(used.contains("photo.jpg"));
    }

    #[test]
    fn test_dedupe_basename_collision_appends_suffix() {
        let mut used: HashSet<String> = HashSet::new();
        used.insert("photo.jpg".to_string());

        let name = dedupe_basename("photo", "jpg", &mut used);
        assert_eq!(name, "photo_001.jpg");

        let name2 = dedupe_basename("photo", "jpg", &mut used);
        assert_eq!(name2, "photo_002.jpg");
    }

    #[test]
    fn test_dedupe_basename_skips_existing_suffixes() {
        let mut used: HashSet<String> = HashSet::new();
        used.insert("photo.jpg".to_string());
        used.insert("photo_001.jpg".to_string());

        let name = dedupe_basename("photo", "jpg", &mut used);
        assert_eq!(name, "photo_002.jpg");
    }

    #[test]
    fn test_resolve_file_name_dedupes_within_session() {
        let mut used: HashSet<String> = HashSet::new();
        let a = resolve_file_name("https://x.com/img.jpg", &mut used);
        let b = resolve_file_name("https://y.com/img.jpg", &mut used);
        assert_eq!(a, "img.jpg");
        assert_eq!(b, "img_001.jpg");
    }
}
