use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UrlSegment {
    Literal(String),
    IndexRange { start: u32, to: Option<u32> },
    StringArray(Vec<String>),
}

#[derive(Debug, Clone)]
pub struct ParsedUrlPattern {
    pub segments: Vec<UrlSegment>,
}

#[derive(Debug)]
pub enum PatternError {
    InvalidSyntax(String),
    InvalidIndex(String),
}

impl std::fmt::Display for PatternError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PatternError::InvalidSyntax(msg) => write!(f, "Invalid syntax: {}", msg),
            PatternError::InvalidIndex(msg) => write!(f, "Invalid index: {}", msg),
        }
    }
}

impl std::error::Error for PatternError {}

pub fn parse_url_pattern(input: &str) -> Result<ParsedUrlPattern, PatternError> {
    let mut segments = Vec::new();
    let mut remaining = input;

    while !remaining.is_empty() {
        if remaining.starts_with("{index") {
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
            }
            results = new_results;
        }

        results
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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
}
