---
name: rust-tauri-patterns
description: Tauri 미디어 다운로더의 Rust 백엔드 코드를 작성할 때 사용한다. sequence_index 모듈, regex 컴파일, specificity 점수, AppState 확장, tauri::command 작성 패턴을 다룬다. Rust 모듈을 추가하거나 src-tauri/src/ 하위 코드를 변경할 때 반드시 참조.
---

# rust-tauri-patterns

Tauri 미디어 다운로더 Rust 백엔드 작성 패턴. URL 자동 매칭 인덱스 구현에 특화.

## 1. 작업 시작 전 필수 확인

코드를 쓰기 전 다음 파일을 읽어 기존 패턴을 파악한다:
- `src-tauri/src/lib.rs` — `AppState`, setup, invoke_handler 등록
- `src-tauri/src/crawler/pattern.rs` — `UrlSegment`, `parse_url_pattern`, `match_and_capture`
- `src-tauri/src/commands/sequence.rs` — 기존 command 시그니처
- `src-tauri/src/commands/download.rs` — `start_download` 본문
- `src-tauri/src/models/sequence.rs` — `Sequence`, `SequenceMeta`
- `src-tauri/Cargo.toml` — 사용 가능한 dep

## 2. 모듈 구조

신규 모듈 `src-tauri/src/sequence_index/`는 다음 파일로 구성:

```
sequence_index/
├── mod.rs              # SequenceIndex, CompiledSequence, MatchResult, find_best/upsert/remove
├── regex_compile.rs    # ParsedUrlPattern → regex::Regex + literal_prefix + capture_names
├── specificity.rs      # SpecificityScore + 비교/계산
└── tests.rs            # 단위 테스트 (test-engineer가 작성)
```

`lib.rs`에 `mod sequence_index;` 추가.

## 3. 패턴 → Regex 변환 규칙

`src-tauri/src/crawler/pattern.rs`의 `UrlSegment` 5종을 다음 규칙으로 매핑:

| `UrlSegment` | Regex 변환 |
|---|---|
| `Literal(s)` | `regex::escape(s)` |
| `Wildcard` | `[^/?#]+` |
| `NamedCapture(name)` | `(?P<name>[^/?#]+)` |
| `IndexRange{start, to}` | `\d+` |
| `StringArray(items)` | `(?:item1\|item2\|...)` (각 item escape) |

전체 regex는 `^...$` anchor. `RegexBuilder::new(...).size_limit(1_000_000).build()`로 폭주 방어.

`literal_prefix`는 첫 비-Literal 세그먼트 직전까지의 Literal 문자열 합. Stage 2 prefilter에 사용.
`host_key`는 `url::Url::parse(literal_prefix).map(|u| format!("{}://{}", u.scheme(), u.host_str().unwrap_or(""))).ok()`. host 추출 불가하면 fallback bucket으로.

## 4. Specificity 점수

```rust
pub struct SpecificityScore {
    pub literal_chars: usize,        // 모든 Literal 문자 합
    pub named_captures: usize,       // {name} 개수
    pub path_depth: usize,           // url_pattern 내 "/" 개수
    pub wildcards: usize,            // {*} 개수
    pub open_indices: usize,         // {index:start=N} (to 없음) 개수
    pub tiebreak_hash: u64,          // 시퀀스 이름의 안정 해시 (DefaultHasher)
}
```

비교 규칙: 클수록 우선이지만 `wildcards`, `open_indices`는 적을수록 우선이므로 `Ord` 구현 시 부호 반전. `tiebreak_hash`는 마지막 결정적 정렬 키.

```rust
impl Ord for SpecificityScore {
    fn cmp(&self, other: &Self) -> Ordering {
        self.literal_chars.cmp(&other.literal_chars)
            .then_with(|| self.named_captures.cmp(&other.named_captures))
            .then_with(|| self.path_depth.cmp(&other.path_depth))
            .then_with(|| other.wildcards.cmp(&self.wildcards))
            .then_with(|| other.open_indices.cmp(&self.open_indices))
            .then_with(|| other.tiebreak_hash.cmp(&self.tiebreak_hash))
    }
}
```

## 5. SequenceIndex 구조

```rust
pub struct CompiledSequence {
    pub name: String,
    pub url_pattern_raw: String,
    pub regex: regex::Regex,
    pub literal_prefix: String,
    pub host_key: String,
    pub specificity: SpecificityScore,
    pub capture_names: Vec<String>,
}

pub struct SequenceIndex {
    by_host: HashMap<String, Vec<Arc<CompiledSequence>>>,
    name_to_arc: HashMap<String, Arc<CompiledSequence>>, // upsert/remove용
}

impl SequenceIndex {
    pub fn build(sequences_dir: &Path) -> Self;
    pub fn find_best(&self, url: &str) -> Option<MatchResult>;
    pub fn upsert(&mut self, sequence: &Sequence);
    pub fn remove(&mut self, name: &str);
}
```

`build`: 디렉토리 스캔 → JSON 파싱 → 각 시퀀스를 `CompiledSequence`로 컴파일 → host bucket에 분배.
`upsert`: 같은 이름 있으면 기존 host bucket에서 제거 후 새로 추가.
`remove`: `name_to_arc`로 host_key 조회 → 해당 bucket에서 제거.

## 6. find_best 알고리즘

```rust
pub fn find_best(&self, url: &str) -> Option<MatchResult> {
    // Stage 1: host bucket 룩업
    let host_key = url::Url::parse(url).ok()
        .map(|u| format!("{}://{}", u.scheme(), u.host_str().unwrap_or("")))?;
    let candidates = self.by_host.get(&host_key)?;

    // Stage 2: literal prefix 비교
    let mut filtered: Vec<&Arc<CompiledSequence>> = candidates.iter()
        .filter(|c| url.starts_with(&c.literal_prefix))
        .collect();

    // Stage 3: regex 매칭 + specificity 정렬
    let mut matches: Vec<(&Arc<CompiledSequence>, HashMap<String, String>)> = filtered.iter()
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

    if matches.is_empty() { return None; }
    matches.sort_by(|a, b| b.0.specificity.cmp(&a.0.specificity));

    // 동률 검출
    let best_score = &matches[0].0.specificity;
    let tied: Vec<String> = matches.iter()
        .skip(1)
        .take_while(|(c, _)| c.specificity.cmp(best_score) == Ordering::Equal)
        .map(|(c, _)| c.name.clone())
        .collect();

    Some(MatchResult {
        sequence_name: matches[0].0.name.clone(),
        url_pattern: matches[0].0.url_pattern_raw.clone(),
        captures: matches[0].1.clone(),
        tied_candidates: tied,
    })
}
```

## 7. AppState 확장

```rust
// lib.rs
use tokio::sync::RwLock;

pub struct AppState {
    pub db: Arc<Mutex<Connection>>,
    pub base_dir: PathBuf,
    pub sequence_index: Arc<RwLock<SequenceIndex>>,
}

// setup 내부:
let sequences_dir = base_dir.join("sequences");
let index = SequenceIndex::build(&sequences_dir);
app.manage(AppState {
    db: Arc::new(Mutex::new(conn)),
    base_dir,
    sequence_index: Arc::new(RwLock::new(index)),
});
```

`tokio::sync::RwLock` (이미 tokio 사용 중) — 신규 dep 불필요.

## 8. Tauri Command 작성 패턴

### find_sequence_by_url

```rust
#[derive(Serialize)]
pub struct MatchResult {
    pub sequence_name: String,
    pub url_pattern: String,
    pub captures: HashMap<String, String>,
    pub tied_candidates: Vec<String>,
}

#[tauri::command]
pub async fn find_sequence_by_url(
    state: State<'_, AppState>,
    url: String,
) -> Result<Option<MatchResult>, String> {
    let index = state.sequence_index.read().await;
    Ok(index.find_best(&url))
}
```

**중요**: serde 직렬화는 기본 snake_case. `MatchResult` 필드명은 TS 측에서 `sequence_name`, `url_pattern`, `tied_candidates`로 그대로 받음.

### start_download_by_url (기존 start_download 교체)

```rust
#[tauri::command]
pub async fn start_download_by_url(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    url: String,
) -> Result<i64, String> {
    // 1. 매칭
    let match_result = {
        let index = state.sequence_index.read().await;
        index.find_best(&url).ok_or("No matching sequence".to_string())?
    };

    // 2. 시퀀스 JSON 로드 (기존 get_sequence 로직과 동일)
    let dir = sequences_dir(&app);
    let file_name = format!("{}.json", match_result.sequence_name.replace(' ', "-").to_lowercase());
    let json = std::fs::read_to_string(dir.join(&file_name)).map_err(|e| e.to_string())?;
    let mut sequence: Sequence = serde_json::from_str(&json).map_err(|e| e.to_string())?;

    // 3. url_pattern을 입력 URL로 오버라이드
    sequence.url_pattern = url.clone();
    let sequence_json = serde_json::to_string(&sequence).map_err(|e| e.to_string())?;

    // 4. 기존 start_download 본문(DB insert + DownloadEngine spawn) 실행
    // (download.rs 기존 코드 재사용)
}
```

### create_sequence / delete_sequence 시그니처 변경

```rust
#[tauri::command]
pub async fn create_sequence(
    app: tauri::AppHandle,
    state: State<'_, AppState>,    // 신규 인자
    json: String,
) -> Result<String, String> {
    // ... 기존 본문 ...
    fs::write(&path, &json).map_err(|e| e.to_string())?;

    // 인덱스 갱신
    let seq: Sequence = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    state.sequence_index.write().await.upsert(&seq);

    Ok(file_name)
}

#[tauri::command]
pub async fn delete_sequence(
    app: tauri::AppHandle,
    state: State<'_, AppState>,    // 신규 인자
    name: String,
) -> Result<(), String> {
    // ... 기존 fs::remove_file ...
    state.sequence_index.write().await.remove(&name);
    Ok(())
}
```

## 9. invoke_handler 갱신

`lib.rs`의 `tauri::generate_handler![...]`에서 변경:
- `download::start_download` 제거
- `download::start_download_by_url` 추가
- `sequence::find_sequence_by_url` 추가

## 10. 빌드 검증

작업 후 반드시:
```bash
cd src-tauri && cargo check
cd src-tauri && cargo test --lib
```

`cargo check` 실패 시 즉시 수정. 1회 재시도 후 실패 시 오케스트레이터에 보고.

## 11. 주의 사항

- `url::Url` 사용 시 `Cargo.toml`에 이미 있는지 확인. 없으면 `url = "2"` 추가 (기존 engine.rs에서 사용 중인지 검증).
- `regex` crate는 이미 포함됨 (`Cargo.toml` 확인).
- `tokio::sync::Mutex`와 `tokio::sync::RwLock` 혼용 OK. 새 RwLock 추가는 tokio dep 변경 불필요.
- 기존 `pattern.rs`의 `match_and_capture`/`apply_captures`/`generate_urls`는 변경 금지. `engine.rs`가 사용 중.
