use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UrlSegment {
    Literal(String),
    IndexRange { start: u32, to: Option<u32> },
    StringArray(Vec<String>),
    Wildcard,
    NamedCapture(String),
}

#[derive(Debug, Clone)]
pub struct ParsedUrlPattern {
    pub segments: Vec<UrlSegment>,
}

#[derive(Debug)]
pub enum PatternError {
    InvalidSyntax(String),
    InvalidIndex(String),
    MatchFailed(String),
}

impl std::fmt::Display for PatternError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PatternError::InvalidSyntax(msg) => write!(f, "Invalid syntax: {}", msg),
            PatternError::InvalidIndex(msg) => write!(f, "Invalid index: {}", msg),
            PatternError::MatchFailed(msg) => write!(f, "Match failed: {}", msg),
        }
    }
}

impl std::error::Error for PatternError {}

pub fn parse_url_pattern(input: &str) -> Result<ParsedUrlPattern, PatternError> {
    let mut segments = Vec::new();
    let mut remaining = input;

    while !remaining.is_empty() {
        if remaining.starts_with("{*}") {
            segments.push(UrlSegment::Wildcard);
            remaining = &remaining[3..];
        } else if remaining.starts_with("{index") {
            let end = remaining
                .find('}')
                .ok_or_else(|| PatternError::InvalidSyntax("Unclosed {index...}".to_string()))?;
            let inner = &remaining[1..end];
            let seg = parse_index_segment(inner)?;
            segments.push(seg);
            remaining = &remaining[end + 1..];
        } else if remaining.starts_with("{[") {
            let end = remaining
                .find("]}")
                .ok_or_else(|| PatternError::InvalidSyntax("Unclosed {[...]}".to_string()))?;
            let inner = &remaining[2..end];
            let items: Vec<String> = inner.split(',').map(|s| s.trim().to_string()).collect();
            if items.is_empty() {
                return Err(PatternError::InvalidSyntax("Empty string array".to_string()));
            }
            segments.push(UrlSegment::StringArray(items));
            remaining = &remaining[end + 2..];
        } else if remaining.starts_with('{') {
            let end = remaining
                .find('}')
                .ok_or_else(|| PatternError::InvalidSyntax("Unclosed {name}".to_string()))?;
            let name = remaining[1..end].to_string();
            if name.is_empty() {
                return Err(PatternError::InvalidSyntax("Empty capture name".to_string()));
            }
            segments.push(UrlSegment::NamedCapture(name));
            remaining = &remaining[end + 1..];
        } else {
            let end = remaining.find('{').unwrap_or(remaining.len());
            segments.push(UrlSegment::Literal(remaining[..end].to_string()));
            remaining = &remaining[end..];
        }
    }

    Ok(ParsedUrlPattern { segments })
}

fn parse_index_segment(inner: &str) -> Result<UrlSegment, PatternError> {
    let mut start: u32 = 0;
    let mut to: Option<u32> = None;

    if let Some(params_str) = inner.strip_prefix("index:") {
        for param in params_str.split(',') {
            let param = param.trim();
            if let Some(val) = param.strip_prefix("start=") {
                start = val
                    .trim()
                    .parse()
                    .map_err(|_| PatternError::InvalidIndex(format!("Invalid start: {}", val)))?;
            } else if let Some(val) = param.strip_prefix("to=") {
                to = Some(
                    val.trim()
                        .parse()
                        .map_err(|_| PatternError::InvalidIndex(format!("Invalid to: {}", val)))?,
                );
            }
        }
    }

    Ok(UrlSegment::IndexRange { start, to })
}

/// Match a concrete URL against a pattern and extract named captures.
/// `{*}` matches any non-empty segment between delimiters.
/// `{name}` captures the matched segment into the returned HashMap.
pub fn match_and_capture(
    pattern: &ParsedUrlPattern,
    url: &str,
) -> Result<HashMap<String, String>, PatternError> {
    let mut captures = HashMap::new();
    let mut remaining = url;

    for (i, segment) in pattern.segments.iter().enumerate() {
        match segment {
            UrlSegment::Literal(s) => {
                if remaining.starts_with(s.as_str()) {
                    remaining = &remaining[s.len()..];
                } else {
                    return Err(PatternError::MatchFailed(format!(
                        "Expected literal '{}' at '{}'",
                        s, remaining
                    )));
                }
            }
            UrlSegment::Wildcard | UrlSegment::NamedCapture(_) => {
                // Find the delimiter: next literal segment's text, or end of string
                let delimiter = find_next_literal(&pattern.segments, i + 1);
                let end_pos = if let Some(ref delim) = delimiter {
                    remaining.find(delim.as_str()).ok_or_else(|| {
                        PatternError::MatchFailed(format!(
                            "Could not find delimiter '{}' in '{}'",
                            delim, remaining
                        ))
                    })?
                } else {
                    remaining.len()
                };

                let matched = &remaining[..end_pos];
                if matched.is_empty() {
                    return Err(PatternError::MatchFailed(
                        "Wildcard/capture matched empty string".to_string(),
                    ));
                }

                if let UrlSegment::NamedCapture(name) = segment {
                    captures.insert(name.clone(), matched.to_string());
                }

                remaining = &remaining[end_pos..];
            }
            UrlSegment::IndexRange { .. } | UrlSegment::StringArray(_) => {
                // For matching purposes, treat like a named capture (match any value)
                let delimiter = find_next_literal(&pattern.segments, i + 1);
                let end_pos = if let Some(ref delim) = delimiter {
                    remaining.find(delim.as_str()).ok_or_else(|| {
                        PatternError::MatchFailed(format!(
                            "Could not find delimiter '{}' in '{}'",
                            delim, remaining
                        ))
                    })?
                } else {
                    remaining.len()
                };
                remaining = &remaining[end_pos..];
            }
        }
    }

    Ok(captures)
}

/// Apply captured values to a pattern, replacing `{name}` tokens with their values.
/// After application, the pattern can be used with `generate_urls()` for remaining
/// `{index:...}` and `{[...]}` tokens.
pub fn apply_captures(
    pattern: &str,
    captures: &HashMap<String, String>,
) -> Result<ParsedUrlPattern, PatternError> {
    let mut resolved = pattern.to_string();
    for (name, value) in captures {
        let token = format!("{{{}}}", name);
        resolved = resolved.replace(&token, value);
    }
    parse_url_pattern(&resolved)
}

fn find_next_literal(segments: &[UrlSegment], from: usize) -> Option<String> {
    for seg in segments.iter().skip(from) {
        if let UrlSegment::Literal(s) = seg {
            return Some(s.clone());
        }
    }
    None
}

impl ParsedUrlPattern {
    pub fn generate_urls(&self) -> Vec<String> {
        let mut results = vec!["".to_string()];

        for segment in &self.segments {
            let mut new_results = Vec::new();
            match segment {
                UrlSegment::Literal(s) => {
                    for r in &results {
                        new_results.push(format!("{}{}", r, s));
                    }
                }
                UrlSegment::IndexRange { start, to } => {
                    let end = to.unwrap_or(start + 100);
                    for i in *start..=end {
                        for r in &results {
                            new_results.push(format!("{}{}", r, i));
                        }
                    }
                }
                UrlSegment::StringArray(items) => {
                    for item in items {
                        for r in &results {
                            new_results.push(format!("{}{}", r, item));
                        }
                    }
                }
                UrlSegment::Wildcard => {
                    // Wildcard is skipped during URL generation
                    new_results = results.clone();
                }
                UrlSegment::NamedCapture(name) => {
                    // Unresolved named capture — keep as placeholder
                    for r in &results {
                        new_results.push(format!("{}{{{}}}", r, name));
                    }
                }
            }
            results = new_results;
        }

        results
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // === Existing tests ===

    #[test]
    fn test_parse_literal_only() {
        let pattern = parse_url_pattern("https://example.com/gallery").unwrap();
        let urls = pattern.generate_urls();
        assert_eq!(urls, vec!["https://example.com/gallery"]);
    }

    #[test]
    fn test_parse_index_with_range() {
        let pattern = parse_url_pattern("https://example.com/page/{index:start=1,to=3}").unwrap();
        let urls = pattern.generate_urls();
        assert_eq!(
            urls,
            vec![
                "https://example.com/page/1",
                "https://example.com/page/2",
                "https://example.com/page/3",
            ]
        );
    }

    #[test]
    fn test_parse_string_array() {
        let pattern =
            parse_url_pattern("https://example.com/{[cats, dogs, birds]}/photo").unwrap();
        let urls = pattern.generate_urls();
        assert_eq!(
            urls,
            vec![
                "https://example.com/cats/photo",
                "https://example.com/dogs/photo",
                "https://example.com/birds/photo",
            ]
        );
    }

    #[test]
    fn test_parse_combined_pattern() {
        let pattern = parse_url_pattern(
            "https://example.com/{[a, b]}/page/{index:start=0,to=1}",
        )
        .unwrap();
        let urls = pattern.generate_urls();
        assert_eq!(
            urls,
            vec![
                "https://example.com/a/page/0",
                "https://example.com/b/page/0",
                "https://example.com/a/page/1",
                "https://example.com/b/page/1",
            ]
        );
    }

    #[test]
    fn test_invalid_unclosed_index() {
        let result = parse_url_pattern("https://example.com/{index:start=1");
        assert!(result.is_err());
    }

    // === Wildcard tests ===

    #[test]
    fn test_parse_wildcard() {
        let pattern = parse_url_pattern("https://example.com/{*}/page").unwrap();
        // Wildcard produces empty string in generation (used only for matching)
        let urls = pattern.generate_urls();
        assert_eq!(urls, vec!["https://example.com//page"]);
    }

    // === Named capture tests ===

    #[test]
    fn test_parse_named_capture() {
        let pattern = parse_url_pattern("https://example.com/{id}/view").unwrap();
        let urls = pattern.generate_urls();
        // Unresolved capture stays as placeholder
        assert_eq!(urls, vec!["https://example.com/{id}/view"]);
    }

    // === match_and_capture tests ===

    #[test]
    fn test_match_simple_capture() {
        let pattern = parse_url_pattern("https://example.com/{id}.html").unwrap();
        let captures =
            match_and_capture(&pattern, "https://example.com/42856.html").unwrap();
        assert_eq!(captures.get("id").unwrap(), "42856");
    }

    #[test]
    fn test_match_wildcard_and_capture() {
        let pattern =
            parse_url_pattern("https://gallery.example.com/{*}/{id}.html#{page}").unwrap();
        let captures = match_and_capture(
            &pattern,
            "https://gallery.example.com/articles/some-long-title-42856.html#1",
        )
        .unwrap();

        assert_eq!(
            captures.get("id").unwrap(),
            "some-long-title-42856"
        );
        assert_eq!(captures.get("page").unwrap(), "1");
        assert!(!captures.contains_key("*"));
    }

    #[test]
    fn test_match_multiple_captures() {
        let pattern =
            parse_url_pattern("https://cdn.example.com/{domain}/{album}/{file}").unwrap();
        let captures = match_and_capture(
            &pattern,
            "https://cdn.example.com/photos/vacation/sunset.jpg",
        )
        .unwrap();

        assert_eq!(captures.get("domain").unwrap(), "photos");
        assert_eq!(captures.get("album").unwrap(), "vacation");
        assert_eq!(captures.get("file").unwrap(), "sunset.jpg");
    }

    #[test]
    fn test_match_fails_on_wrong_literal() {
        let pattern = parse_url_pattern("https://example.com/{id}.html").unwrap();
        let result = match_and_capture(&pattern, "https://other.com/123.html");
        assert!(result.is_err());
    }

    // === apply_captures tests ===

    #[test]
    fn test_apply_captures_simple() {
        let mut captures = HashMap::new();
        captures.insert("id".to_string(), "42856".to_string());

        let pattern =
            apply_captures("https://gallery.example.com/reader/{id}.html", &captures).unwrap();
        let urls = pattern.generate_urls();
        assert_eq!(urls, vec!["https://gallery.example.com/reader/42856.html"]);
    }

    #[test]
    fn test_apply_captures_with_index() {
        let mut captures = HashMap::new();
        captures.insert("id".to_string(), "42856".to_string());

        let pattern = apply_captures(
            "https://gallery.example.com/reader/{id}.html#{index:start=1,to=3}-",
            &captures,
        )
        .unwrap();
        let urls = pattern.generate_urls();
        assert_eq!(
            urls,
            vec![
                "https://gallery.example.com/reader/42856.html#1-",
                "https://gallery.example.com/reader/42856.html#2-",
                "https://gallery.example.com/reader/42856.html#3-",
            ]
        );
    }

    #[test]
    fn test_full_flow_entry_to_media() {
        // 1. Parse entry pattern
        let entry_pattern =
            parse_url_pattern("https://gallery.example.com/{*}/{id}.html#{page}").unwrap();

        // 2. Match concrete URL against entry pattern
        let captures = match_and_capture(
            &entry_pattern,
            "https://gallery.example.com/articles/some-title-42856.html#1",
        )
        .unwrap();

        // 3. Apply captures to media URL template
        let media_pattern = apply_captures(
            "https://gallery.example.com/reader/{id}.html#{index:start=1,to=3}-",
            &captures,
        )
        .unwrap();

        // 4. Generate media URLs
        let urls = media_pattern.generate_urls();
        assert_eq!(
            urls,
            vec![
                "https://gallery.example.com/reader/some-title-42856.html#1-",
                "https://gallery.example.com/reader/some-title-42856.html#2-",
                "https://gallery.example.com/reader/some-title-42856.html#3-",
            ]
        );
    }
}
