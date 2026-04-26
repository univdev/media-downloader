use crate::crawler::pattern::{ParsedUrlPattern, UrlSegment};
use std::cmp::Ordering;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

#[derive(Debug, Clone, Eq, PartialEq)]
pub struct SpecificityScore {
    pub literal_chars: usize,
    pub named_captures: usize,
    pub path_depth: usize,
    pub wildcards: usize,
    pub open_indices: usize,
    pub tiebreak_hash: u64,
}

impl SpecificityScore {
    /// 동률 판정용 키 (tiebreak_hash 제외).
    /// 정렬용 cmp는 hash 포함이지만, 동률 후보 검출은 의미적 specificity만 비교.
    pub fn score_key(
        &self,
    ) -> (
        usize,
        usize,
        usize,
        std::cmp::Reverse<usize>,
        std::cmp::Reverse<usize>,
    ) {
        (
            self.literal_chars,
            self.named_captures,
            self.path_depth,
            std::cmp::Reverse(self.wildcards),
            std::cmp::Reverse(self.open_indices),
        )
    }
}

impl Ord for SpecificityScore {
    fn cmp(&self, other: &Self) -> Ordering {
        self.literal_chars
            .cmp(&other.literal_chars)
            .then_with(|| self.named_captures.cmp(&other.named_captures))
            .then_with(|| self.path_depth.cmp(&other.path_depth))
            .then_with(|| other.wildcards.cmp(&self.wildcards))
            .then_with(|| other.open_indices.cmp(&self.open_indices))
            .then_with(|| other.tiebreak_hash.cmp(&self.tiebreak_hash))
    }
}

impl PartialOrd for SpecificityScore {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

pub fn compute(
    parsed: &ParsedUrlPattern,
    name: &str,
    url_pattern_raw: &str,
) -> SpecificityScore {
    let mut literal_chars = 0usize;
    let mut named_captures = 0usize;
    let mut wildcards = 0usize;
    let mut open_indices = 0usize;

    for seg in &parsed.segments {
        match seg {
            UrlSegment::Literal(s) => literal_chars += s.chars().count(),
            UrlSegment::NamedCapture(_) => named_captures += 1,
            UrlSegment::Wildcard => wildcards += 1,
            UrlSegment::IndexRange { to, .. } => {
                if to.is_none() {
                    open_indices += 1;
                }
            }
            UrlSegment::StringArray(_) => {}
        }
    }

    let path_depth = url_pattern_raw.matches('/').count();

    let mut hasher = DefaultHasher::new();
    name.hash(&mut hasher);
    let tiebreak_hash = hasher.finish();

    SpecificityScore {
        literal_chars,
        named_captures,
        path_depth,
        wildcards,
        open_indices,
        tiebreak_hash,
    }
}
