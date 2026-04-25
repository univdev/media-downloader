use chrono::Local;
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

pub fn resolve_file_name(
    pattern: &str,
    index: u32,
    download_date: &str,
    selector_text: Option<&str>,
    source: &str,
    extension: &str,
) -> String {
    let name = match source {
        "selector" => selector_text
            .map(|t| {
                let mut result = sanitize_filename(t);
                result.push_str(&format!("_{:03}", index));
                result
            })
            .unwrap_or_else(|| format!("{:03}", index)),
        _ => {
            let now = Local::now();
            pattern
                .replace("{index}", &format!("{:03}", index))
                .replace("{date}", &now.format("%Y-%m-%d").to_string())
                .replace("{datetime}", &now.format("%Y-%m-%d_%H%M%S").to_string())
        }
    };

    format!("{}.{}", name, extension)
}

pub fn validate_file_pattern(pattern: &str) -> bool {
    pattern.contains("{index}")
        || pattern.contains("{date}")
        || pattern.contains("{datetime}")
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
    fn test_validate_file_pattern_with_index() {
        assert!(validate_file_pattern("photo_{index}"));
    }

    #[test]
    fn test_validate_file_pattern_with_date() {
        assert!(validate_file_pattern("{date}_image"));
    }

    #[test]
    fn test_validate_file_pattern_plain_text_rejected() {
        assert!(!validate_file_pattern("plain_text"));
    }

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
}
