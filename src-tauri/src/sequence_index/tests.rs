//! Unit tests + performance benchmark for `sequence_index`.
//!
//! Run all tests:
//!     cargo test --release sequence_index
//!
//! Run only the perf benchmark with output:
//!     cargo test --release perf_find_best_10k_under_5ms_p99 -- --nocapture

use super::*;
use crate::crawler::pattern::{match_and_capture, parse_url_pattern};
use crate::models::sequence::{Sequence, SequenceMeta, SequenceNaming, SequenceSelectors};
use std::time::Instant;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Build a minimal `Sequence` with the given name and url_pattern.
/// All other fields receive default-ish values so the Sequence is valid.
fn make_sequence(name: &str, pattern: &str) -> Sequence {
    Sequence {
        version: "1.0".to_string(),
        meta: SequenceMeta {
            name: name.to_string(),
            description: String::new(),
            author: String::new(),
            created_at: "2026-04-26T00:00:00Z".to_string(),
            updated_at: "2026-04-26T00:00:00Z".to_string(),
        },
        url_pattern: pattern.to_string(),
        media_url_pattern: None,
        selectors: SequenceSelectors {
            media: "img".to_string(),
            folder_name: None,
        },
        naming: SequenceNaming {
            folder: "{title}".to_string(),
            folder_source: "literal".to_string(),
        },
    }
}

/// Build a `CompiledSequence` (not wrapped in Arc) for direct specificity comparison.
fn make_compiled(name: &str, pattern: &str) -> CompiledSequence {
    let seq = make_sequence(name, pattern);
    super::compile_sequence(&seq).expect("compile_sequence failed")
}

/// Build an index from a list of (name, pattern) tuples.
fn build_index(entries: &[(&str, &str)]) -> SequenceIndex {
    let mut idx = SequenceIndex::new();
    for (name, pattern) in entries {
        idx.upsert(&make_sequence(name, pattern));
    }
    idx
}

// ---------------------------------------------------------------------------
// 1. Specificity ordering — 5 cases per plan §11.1
// ---------------------------------------------------------------------------

#[test]
fn specificity_literal_longer_wins() {
    let a = make_compiled("a", "https://example.com/posts/{id}/page");
    let b = make_compiled("b", "https://example.com/{*}");
    assert!(
        a.specificity > b.specificity,
        "literal-longer pattern should outrank wildcard-only"
    );
}

#[test]
fn specificity_named_capture_beats_wildcard() {
    let a = make_compiled("a", "https://example.com/{id}.html");
    let b = make_compiled("b", "https://example.com/{*}.html");
    assert!(
        a.specificity > b.specificity,
        "named capture should outrank wildcard at equal literal length"
    );
}

#[test]
fn specificity_open_index_loses_to_closed() {
    // Closed (start+to) is more specific than open (start only).
    // The `closed` pattern is `b` here so we assert b > a.
    let a = make_compiled("a", "https://example.com/page/{index:start=1}");
    let b = make_compiled("b", "https://example.com/page/{index:start=1,to=10}");
    assert!(
        b.specificity > a.specificity,
        "closed IndexRange should outrank open one"
    );
}

#[test]
fn specificity_different_host_filtered_out() {
    let idx = build_index(&[
        ("a", "https://aa.example.com/{id}"),
        ("b", "https://bb.example.com/{id}"),
    ]);
    let r = idx
        .find_best("https://aa.example.com/123")
        .expect("expected a match for aa.example.com");
    assert_eq!(r.sequence_name, "a");
    assert!(r.tied_candidates.is_empty());
}

#[test]
fn specificity_full_tie_is_deterministic() {
    let idx = build_index(&[
        ("a", "https://example.com/{id}"),
        ("b", "https://example.com/{slug}"),
    ]);
    let first = idx
        .find_best("https://example.com/x")
        .expect("expected a match")
        .sequence_name;
    for _ in 0..100 {
        let r = idx
            .find_best("https://example.com/x")
            .expect("expected a match");
        assert_eq!(r.sequence_name, first, "tiebreak must be deterministic");
    }
}

// ---------------------------------------------------------------------------
// 2. 0 / 1 / N candidate cases
// ---------------------------------------------------------------------------

#[test]
fn find_best_no_match_returns_none() {
    let idx = build_index(&[("a", "https://example.com/{id}")]);
    assert!(idx.find_best("https://other.example/123").is_none());
}

#[test]
fn find_best_single_match_no_tied_candidates() {
    let idx = build_index(&[
        ("a", "https://example.com/posts/{id}/page"),
        ("b", "https://other.example/{id}"),
    ]);
    let r = idx
        .find_best("https://example.com/posts/42/page")
        .expect("expected a match");
    assert_eq!(r.sequence_name, "a");
    assert!(
        r.tied_candidates.is_empty(),
        "single match must have no tied candidates"
    );
}

#[test]
fn find_best_tied_lists_others() {
    // Two patterns with identical specificity that both match the URL.
    let idx = build_index(&[
        ("a", "https://example.com/{id}"),
        ("b", "https://example.com/{slug}"),
        ("c", "https://example.com/{name}"),
    ]);
    let r = idx
        .find_best("https://example.com/x")
        .expect("expected a match");
    // The chosen one is deterministic; the other two should appear as tied.
    assert_eq!(
        r.tied_candidates.len(),
        2,
        "expected 2 tied candidates besides the winner"
    );
    let mut all = vec![r.sequence_name.clone()];
    all.extend(r.tied_candidates.iter().cloned());
    all.sort();
    assert_eq!(all, vec!["a", "b", "c"]);
}

// ---------------------------------------------------------------------------
// 3. Regex equivalence with match_and_capture
// ---------------------------------------------------------------------------

#[test]
fn regex_extracts_same_captures_as_match_and_capture() {
    let pattern_str = "https://example.com/{id}/page/{*}";
    let parsed = parse_url_pattern(pattern_str).unwrap();
    let url = "https://example.com/42/page/foo";

    let legacy = match_and_capture(&parsed, url).expect("legacy match failed");
    let (regex, _names, _prefix) =
        regex_compile::compile_to_regex(&parsed).expect("regex compile failed");
    let caps = regex.captures(url).expect("regex did not match");

    assert_eq!(
        legacy.get("id").unwrap(),
        caps.name("id").unwrap().as_str()
    );
}

#[test]
fn regex_equivalence_multiple_captures() {
    let pattern_str = "https://cdn.example.com/{domain}/{album}/{file}";
    let parsed = parse_url_pattern(pattern_str).unwrap();
    let url = "https://cdn.example.com/photos/vacation/sunset.jpg";

    let legacy = match_and_capture(&parsed, url).expect("legacy match failed");
    let (regex, names, _prefix) =
        regex_compile::compile_to_regex(&parsed).expect("regex compile failed");
    let caps = regex.captures(url).expect("regex did not match");

    for n in &names {
        assert_eq!(
            legacy.get(n).expect("legacy missing capture"),
            caps.name(n).expect("regex missing capture").as_str(),
            "capture '{}' diverged",
            n
        );
    }
}

// ---------------------------------------------------------------------------
// 4. Performance benchmark — 10k synthetic sequences, p99 < 5ms
// ---------------------------------------------------------------------------

/// Build a synthetic index with `host_count * patterns_per_host` sequences.
/// All produced patterns parse via `parse_url_pattern` and compile to regex.
fn build_synthetic_index(host_count: usize, patterns_per_host: usize) -> SequenceIndex {
    let mut idx = SequenceIndex::new();
    for h in 0..host_count {
        for p in 0..patterns_per_host {
            // Use a per-pattern literal segment (`-p{p}`) so each pattern is unique
            // and Stage 2 (literal prefix) prefilter is exercised meaningfully.
            let pat = format!(
                "https://host{h}.example.com/posts/{{id}}/page/{{*}}-p{p}",
                h = h,
                p = p
            );
            idx.upsert(&make_sequence(&format!("h{}-p{}", h, p), &pat));
        }
    }
    idx
}

#[test]
fn perf_find_best_10k_under_5ms_p99() {
    // 100 hosts × 100 patterns/host = 10_000 sequences.
    let host_count = 100usize;
    let patterns_per_host = 100usize;
    let idx = build_synthetic_index(host_count, patterns_per_host);

    let iters = 1_000usize;
    let mut times_us: Vec<u128> = Vec::with_capacity(iters);

    for i in 0..iters {
        let h = i % host_count;
        let p = i % patterns_per_host;
        // URL designed to actually match pattern (h, p): bucket is exercised end-to-end.
        let url = format!(
            "https://host{h}.example.com/posts/{i}/page/abc-p{p}",
            h = h,
            i = i,
            p = p
        );
        let t = Instant::now();
        let _ = idx.find_best(&url);
        times_us.push(t.elapsed().as_micros());
    }

    times_us.sort_unstable();
    let p50 = times_us[iters / 2];
    let p99 = times_us[(iters * 99) / 100];
    let p99_9 = times_us[(iters * 999) / 1000];
    let max = *times_us.last().unwrap();

    println!(
        "[perf_find_best_10k] p50={p50}µs p99={p99}µs p99.9={p999}µs max={max}µs (n={n})",
        p50 = p50,
        p99 = p99,
        p999 = p99_9,
        max = max,
        n = iters
    );

    assert!(
        p99 < 5_000,
        "p99 = {}µs (target < 5000µs). p50={}µs max={}µs",
        p99,
        p50,
        max
    );
}
