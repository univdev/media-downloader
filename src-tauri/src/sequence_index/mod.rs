pub mod regex_compile;
pub mod specificity;

#[cfg(test)]
mod tests;

use crate::crawler::pattern::parse_url_pattern;
use crate::models::sequence::Sequence;
use regex::Regex;
use serde::Serialize;
use specificity::SpecificityScore;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::sync::Arc;

const FALLBACK_HOST_KEY: &str = "__fallback__";

#[derive(Debug)]
pub struct CompiledSequence {
    pub name: String,
    pub url_pattern_raw: String,
    pub regex: Regex,
    pub literal_prefix: String,
    pub host_key: String,
    pub specificity: SpecificityScore,
    pub capture_names: Vec<String>,
}

#[derive(Serialize, Clone, Debug)]
pub struct MatchResult {
    pub sequence_name: String,
    pub url_pattern: String,
    pub captures: HashMap<String, String>,
    pub tied_candidates: Vec<String>,
}

#[derive(Default)]
pub struct SequenceIndex {
    by_host: HashMap<String, Vec<Arc<CompiledSequence>>>,
    name_to_arc: HashMap<String, Arc<CompiledSequence>>,
}

impl SequenceIndex {
    pub fn new() -> Self {
        Self::default()
    }

    /// Scan `sequences_dir` for `*.json` files, parse each as a `Sequence`,
    /// compile to a `CompiledSequence`, and bucket by host.
    /// Compilation failures are logged and skipped (do not abort the build).
    pub fn build(sequences_dir: &Path) -> Self {
        let mut index = SequenceIndex::new();

        if !sequences_dir.exists() {
            return index;
        }

        let entries = match fs::read_dir(sequences_dir) {
            Ok(e) => e,
            Err(e) => {
                eprintln!(
                    "[sequence_index] Failed to read sequences dir {:?}: {}",
                    sequences_dir, e
                );
                return index;
            }
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if !path.extension().is_some_and(|ext| ext == "json") {
                continue;
            }
            let content = match fs::read_to_string(&path) {
                Ok(c) => c,
                Err(e) => {
                    eprintln!("[sequence_index] Failed to read {:?}: {}", path, e);
                    continue;
                }
            };
            let seq: Sequence = match serde_json::from_str(&content) {
                Ok(s) => s,
                Err(e) => {
                    eprintln!("[sequence_index] Failed to parse {:?}: {}", path, e);
                    continue;
                }
            };
            match compile_sequence(&seq) {
                Some(compiled) => {
                    index.insert_compiled(compiled);
                }
                None => {
                    eprintln!(
                        "[sequence_index] Skipped sequence '{}' (compile failure)",
                        seq.meta.name
                    );
                }
            }
        }

        index
    }

    /// Insert (or replace) a sequence in the index.
    /// If a sequence with the same name already exists, it is removed from
    /// its previous host bucket before the new compiled entry is inserted.
    pub fn upsert(&mut self, sequence: &Sequence) {
        let name = sequence.meta.name.clone();
        self.remove(&name);
        if let Some(compiled) = compile_sequence(sequence) {
            self.insert_compiled(compiled);
        } else {
            eprintln!(
                "[sequence_index] upsert: skipped sequence '{}' (compile failure)",
                name
            );
        }
    }

    /// Remove a sequence by its name. Looks up the host bucket via
    /// `name_to_arc`, then drops the matching entry from that bucket.
    pub fn remove(&mut self, name: &str) {
        if let Some(existing) = self.name_to_arc.remove(name) {
            if let Some(bucket) = self.by_host.get_mut(&existing.host_key) {
                bucket.retain(|c| c.name != name);
                if bucket.is_empty() {
                    self.by_host.remove(&existing.host_key);
                }
            }
        }
    }

    fn insert_compiled(&mut self, compiled: CompiledSequence) {
        let arc = Arc::new(compiled);
        self.name_to_arc.insert(arc.name.clone(), arc.clone());
        self.by_host
            .entry(arc.host_key.clone())
            .or_default()
            .push(arc);
    }

    /// Find the best matching sequence for `url`.
    /// Stage 1: host bucket lookup (with fallback bucket).
    /// Stage 2: literal prefix prefilter.
    /// Stage 3: regex match + specificity sort, with tied-candidate detection.
    pub fn find_best(&self, url: &str) -> Option<MatchResult> {
        // Stage 1: host bucket lookup
        let host_key = url::Url::parse(url)
            .ok()
            .map(|u| format!("{}://{}", u.scheme(), u.host_str().unwrap_or("")));

        let mut candidate_buckets: Vec<&Vec<Arc<CompiledSequence>>> = Vec::new();
        if let Some(ref hk) = host_key {
            if let Some(bucket) = self.by_host.get(hk) {
                candidate_buckets.push(bucket);
            }
        }
        if let Some(bucket) = self.by_host.get(FALLBACK_HOST_KEY) {
            candidate_buckets.push(bucket);
        }
        if candidate_buckets.is_empty() {
            return None;
        }

        // Stage 2: literal prefix prefilter
        let filtered: Vec<&Arc<CompiledSequence>> = candidate_buckets
            .iter()
            .flat_map(|b| b.iter())
            .filter(|c| c.literal_prefix.is_empty() || url.starts_with(&c.literal_prefix))
            .collect();

        if filtered.is_empty() {
            return None;
        }

        // Stage 3: regex match
        let mut matches: Vec<(&Arc<CompiledSequence>, HashMap<String, String>)> = filtered
            .iter()
            .filter_map(|c| {
                c.regex.captures(url).map(|caps| {
                    let mut map = HashMap::new();
                    for name in &c.capture_names {
                        if let Some(v) = caps.name(name) {
                            map.insert(name.clone(), v.as_str().to_string());
                        }
                    }
                    (*c, map)
                })
            })
            .collect();

        if matches.is_empty() {
            return None;
        }

        // Sort by specificity (descending: highest specificity first)
        matches.sort_by(|a, b| b.0.specificity.cmp(&a.0.specificity));

        // Tied candidates: same semantic specificity as the best match (excluding the best itself).
        // Use score_key() (without tiebreak_hash) so that ties are detected by meaningful
        // specificity dimensions only. The sort above is hash-inclusive for determinism.
        let best_key = matches[0].0.specificity.score_key();
        let tied: Vec<String> = matches
            .iter()
            .skip(1)
            .take_while(|(c, _)| c.specificity.score_key() == best_key)
            .map(|(c, _)| c.name.clone())
            .collect();

        Some(MatchResult {
            sequence_name: matches[0].0.name.clone(),
            url_pattern: matches[0].0.url_pattern_raw.clone(),
            captures: matches[0].1.clone(),
            tied_candidates: tied,
        })
    }
}

/// Compile a `Sequence` into a `CompiledSequence`.
/// Returns `None` if any step (URL pattern parsing or regex compilation) fails.
fn compile_sequence(sequence: &Sequence) -> Option<CompiledSequence> {
    let parsed = match parse_url_pattern(&sequence.url_pattern) {
        Ok(p) => p,
        Err(e) => {
            eprintln!(
                "[sequence_index] parse_url_pattern failed for '{}': {}",
                sequence.meta.name, e
            );
            return None;
        }
    };

    let (regex, capture_names, literal_prefix) =
        match regex_compile::compile_to_regex(&parsed) {
            Ok(r) => r,
            Err(e) => {
                eprintln!(
                    "[sequence_index] compile_to_regex failed for '{}': {}",
                    sequence.meta.name, e
                );
                return None;
            }
        };

    let host_key = url::Url::parse(&literal_prefix)
        .ok()
        .map(|u| format!("{}://{}", u.scheme(), u.host_str().unwrap_or("")))
        .unwrap_or_else(|| FALLBACK_HOST_KEY.to_string());

    let specificity =
        specificity::compute(&parsed, &sequence.meta.name, &sequence.url_pattern);

    Some(CompiledSequence {
        name: sequence.meta.name.clone(),
        url_pattern_raw: sequence.url_pattern.clone(),
        regex,
        literal_prefix,
        host_key,
        specificity,
        capture_names,
    })
}
