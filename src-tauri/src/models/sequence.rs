use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SequenceMeta {
    pub name: String,
    pub description: String,
    pub author: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SequenceSelectors {
    pub media: String,
    pub folder_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SequenceNaming {
    pub folder: String,
    pub folder_source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Sequence {
    pub version: String,
    pub meta: SequenceMeta,
    pub url_pattern: String,
    #[serde(default)]
    pub match_patterns: Vec<String>,
    pub crawl_url_pattern: Option<String>,
    pub media_url_pattern: Option<String>,
    pub selectors: SequenceSelectors,
    pub naming: SequenceNaming,
}

impl Sequence {
    pub fn effective_match_patterns(&self) -> Vec<String> {
        let patterns: Vec<String> = self
            .match_patterns
            .iter()
            .map(|p| p.trim())
            .filter(|p| !p.is_empty())
            .map(ToOwned::to_owned)
            .collect();

        if patterns.is_empty() {
            vec![self.url_pattern.clone()]
        } else {
            patterns
        }
    }

    pub fn effective_crawl_url_pattern(&self) -> &str {
        self.crawl_url_pattern
            .as_deref()
            .filter(|p| !p.trim().is_empty())
            .or_else(|| {
                self.media_url_pattern
                    .as_deref()
                    .filter(|p| !p.trim().is_empty())
            })
            .unwrap_or(&self.url_pattern)
    }
}

#[cfg(test)]
mod migration_tests {
    //! Sequence 모델 마이그레이션 호환성 테스트.
    //!
    //! 시퀀스 빌더 UX 개편(Phase 0)에서 다음 필드가 모델에서 제거되었다:
    //!   - SequenceSelectors.file_name
    //!   - SequenceNaming.file
    //!   - SequenceNaming.file_source
    //!
    //! serde 기본 동작(`deny_unknown_fields` 미지정)에 의해 구버전 JSON은
    //! 알려지지 않은 필드를 silently 무시하면서 신규 모델로 deserialize 되어야
    //! 한다. 또한 신규 모델로 다시 serialize 했을 때 `file*` 필드는 더 이상
    //! 출력되지 않아야 한다 (round-trip 검증).
    use super::*;

    /// 헬퍼: 신규 모델 기반 테스트용 Sequence 생성.
    fn make_test_sequence() -> Sequence {
        Sequence {
            version: "1.0".to_string(),
            meta: SequenceMeta {
                name: "round-trip".to_string(),
                description: "rt".to_string(),
                author: "tester".to_string(),
                created_at: "2026-01-01T00:00:00Z".to_string(),
                updated_at: "2026-01-01T00:00:00Z".to_string(),
            },
            url_pattern: "https://example.com/{id}".to_string(),
            match_patterns: vec![],
            crawl_url_pattern: None,
            media_url_pattern: None,
            selectors: SequenceSelectors {
                media: ".gallery img".to_string(),
                folder_name: Some(".title".to_string()),
            },
            naming: SequenceNaming {
                folder: "{title}".to_string(),
                folder_source: "selector".to_string(),
            },
        }
    }

    #[test]
    fn legacy_json_with_file_fields_deserializes_into_new_model() {
        // 구버전 JSON: file_name(selectors), file/file_source(naming) 모두 포함.
        let legacy = r#"{
            "version": "1.0",
            "meta": {
                "name": "old-seq",
                "description": "",
                "author": "",
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:00:00Z"
            },
            "url_pattern": "https://example.com/{id}",
            "media_url_pattern": null,
            "selectors": {
                "media": ".gallery img",
                "folder_name": ".title",
                "file_name": ".caption"
            },
            "naming": {
                "folder": "{date}",
                "folder_source": "literal",
                "file": "{index}",
                "file_source": "pattern"
            }
        }"#;

        let parsed: Sequence =
            serde_json::from_str(legacy).expect("legacy JSON should deserialize into new model");

        // 신규 모델에 남은 필드는 정확히 복원돼야 한다.
        assert_eq!(parsed.version, "1.0");
        assert_eq!(parsed.meta.name, "old-seq");
        assert_eq!(parsed.url_pattern, "https://example.com/{id}");
        assert!(parsed.media_url_pattern.is_none());
        assert_eq!(parsed.selectors.media, ".gallery img");
        assert_eq!(parsed.selectors.folder_name.as_deref(), Some(".title"));
        assert_eq!(parsed.naming.folder, "{date}");
        assert_eq!(parsed.naming.folder_source, "literal");
        // file_name / file / file_source 필드는 모델에서 제거됐으므로
        // 컴파일 시 접근 불가 (이 테스트가 빌드되는 것 자체가 검증 역할).
    }

    #[test]
    fn legacy_json_without_folder_name_still_deserializes() {
        // folder_name(Option) 누락 + file 관련 필드 포함도 호환되어야 한다.
        let legacy = r#"{
            "version": "1.0",
            "meta": {
                "name": "no-folder-sel",
                "description": "",
                "author": "",
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:00:00Z"
            },
            "url_pattern": "https://example.com/{id}",
            "media_url_pattern": null,
            "selectors": {
                "media": ".gallery img",
                "file_name": ".caption"
            },
            "naming": {
                "folder": "{date}",
                "folder_source": "literal",
                "file": "{index}",
                "file_source": "pattern"
            }
        }"#;

        let parsed: Sequence = serde_json::from_str(legacy)
            .expect("legacy JSON without folder_name should still deserialize");
        assert!(parsed.selectors.folder_name.is_none());
        assert_eq!(parsed.naming.folder_source, "literal");
    }

    #[test]
    fn new_model_round_trip_drops_file_fields() {
        let seq = make_test_sequence();
        let json = serde_json::to_string(&seq).expect("serialize should succeed");

        // 신규 모델 직렬화 결과에 file 관련 키가 절대 노출되면 안 된다.
        assert!(
            !json.contains("\"file_name\""),
            "file_name should not appear in serialized JSON: {json}"
        );
        assert!(
            !json.contains("\"file_source\""),
            "file_source should not appear in serialized JSON: {json}"
        );
        // naming.folder 토큰("{date}" 등)이 우연히 포함될 수 있으므로
        // file 키만 정확히 매칭하기 위해 quote-prefixed 비교를 사용.
        assert!(
            !json.contains("\"file\":"),
            "naming.file should not appear in serialized JSON: {json}"
        );

        // 다시 파싱해서 핵심 필드가 보존되는지 확인 (round-trip).
        let reparsed: Sequence = serde_json::from_str(&json).expect("re-parse should succeed");
        assert_eq!(reparsed.version, seq.version);
        assert_eq!(reparsed.url_pattern, seq.url_pattern);
        assert_eq!(reparsed.selectors.media, seq.selectors.media);
        assert_eq!(reparsed.selectors.folder_name, seq.selectors.folder_name);
        assert_eq!(reparsed.naming.folder, seq.naming.folder);
        assert_eq!(reparsed.naming.folder_source, seq.naming.folder_source);
    }
}
