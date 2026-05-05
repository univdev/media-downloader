use crate::crawler::pattern::{ParsedUrlPattern, UrlSegment};
use regex::{Regex, RegexBuilder};

/// Compile a parsed URL pattern into an anchored `Regex`.
///
/// Returns:
/// - the compiled `Regex` (anchored with `^...$`)
/// - the ordered list of named capture group names
/// - the literal prefix (concatenation of all leading `Literal` segments
///   up to but not including the first non-`Literal` segment)
pub fn compile_to_regex(
    parsed: &ParsedUrlPattern,
) -> Result<(Regex, Vec<String>, String), regex::Error> {
    let mut pattern = String::from("^");
    let mut capture_names: Vec<String> = Vec::new();
    let mut literal_prefix = String::new();
    let mut prefix_done = false;

    for seg in &parsed.segments {
        match seg {
            UrlSegment::Literal(s) => {
                if !prefix_done {
                    literal_prefix.push_str(s);
                }
                pattern.push_str(&regex::escape(s));
            }
            UrlSegment::Wildcard => {
                prefix_done = true;
                pattern.push_str("[^/?#]+");
            }
            UrlSegment::NamedCapture(name) => {
                prefix_done = true;
                pattern.push_str(&format!("(?P<{}>[^/?#]+)", name));
                capture_names.push(name.clone());
            }
            UrlSegment::IndexRange { .. } => {
                prefix_done = true;
                if capture_names.iter().any(|n| n == "index") {
                    pattern.push_str(r"\d+");
                } else {
                    pattern.push_str(r"(?P<index>\d+)");
                    capture_names.push("index".to_string());
                }
            }
            UrlSegment::StringArray(items) => {
                prefix_done = true;
                let alts: Vec<String> = items.iter().map(|i| regex::escape(i)).collect();
                pattern.push_str(&format!("(?:{})", alts.join("|")));
            }
        }
    }

    pattern.push('$');

    let regex = RegexBuilder::new(&pattern).size_limit(1_000_000).build()?;

    Ok((regex, capture_names, literal_prefix))
}
