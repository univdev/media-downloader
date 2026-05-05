---
name: tauri-boundary-qa
description: Tauri Rust command와 TypeScript invoke 호출 사이의 데이터 정합성을 검증할 때 사용한다. 인자 이름, 인자 타입, 반환 struct/interface 필드, 직렬화 규칙(snake_case/camelCase)이 양쪽에서 일치하는지 경계면 교차 비교한다. 백엔드 또는 프론트엔드 코드 변경 후 반드시 실행.
---

# tauri-boundary-qa

Tauri Rust ↔ TypeScript 경계면 정합성 검증.

## 1. 핵심 원칙

**"한 쪽만 보고 OK 사인하지 않는다."** 양쪽 파일을 동시에 열어 한 줄씩 대조한다. "쪽지 한 쪽만 본 QA"가 가장 흔한 결함 원인.

## 2. 검증 매트릭스 작성

각 command마다 다음 4행을 채운다:

| 항목 | Rust (src-tauri/...) | TS API (src/.../api) | TS 호출처 (ViewModel) | 모킹 (__mocks__/tauri-core.ts) |
|---|---|---|---|---|
| command 이름 | `#[tauri::command] async fn ...` | `invoke<T>("...", ...)` | (간접) | `mockInvoke("...", ...)` |
| 인자 키 | 함수 인자명 (snake_case) | invoke 두번째 인자 객체 키 | 호출 시 전달 키 | mock 핸들러 인자 키 |
| 인자 타입 | Rust 타입 | TS 타입 | TS 타입 | mock 시그니처 |
| 반환 타입 | `Result<T, E>` 의 T | `Promise<...>` | (간접) | mock 반환값 |

## 3. Tauri v2 직렬화 규칙

| 규칙 | Rust | TS |
|---|---|---|
| 기본 직렬화 | `#[derive(Serialize)] pub struct Foo { my_field: i32 }` | `interface Foo { my_field: number }` (snake_case 그대로) |
| camelCase 변환 | `#[serde(rename_all = "camelCase")] pub struct Foo { my_field: i32 }` | `interface Foo { myField: number }` |
| 인자 키 | `async fn cmd(my_arg: String)` | `invoke("cmd", { my_arg: "..." })` (snake_case 그대로) |
| Option<T> | `Option<MatchResult>` | `MatchResult \| null` |
| Result<T, String> | `Result<i64, String>` | `Promise<number>` (에러는 throw) |

**핵심**: Tauri v2는 인자 키를 자동 camelCase 변환하지 않는다. Rust 측 인자명을 TS에서 그대로 써야 한다. 기존 코드 (`{ sequence_json: ... }`)가 증거.

## 4. 검증 절차

### Step 1: 변경된 command 목록 수집
```bash
grep -rn "#\[tauri::command\]" /Users/univdev/Documents/media-downloader/src-tauri/src/commands/
grep -rn "invoke<" /Users/univdev/Documents/media-downloader/src/
```

### Step 2: 각 command 양쪽 파일 동시 오픈
- Rust: `src-tauri/src/commands/{module}.rs`의 `#[tauri::command]` 함수
- TS: `src/features/{feature}/api/{name}.ts`의 `invoke` 호출

### Step 3: 매트릭스 작성 후 비교
| 항목 | Rust | TS | 일치 |
|---|---|---|---|
| 이름 | `find_sequence_by_url` | `"find_sequence_by_url"` | ✓ |
| 인자 키 | `url: String` | `{ url }` | ✓ |
| 반환 | `Result<Option<MatchResult>, String>` | `Promise<MatchResult \| null>` | ✓ |

### Step 4: MatchResult 필드 1:1 비교
| 필드 | Rust 타입 | TS 타입 | 일치 |
|---|---|---|---|
| `sequence_name` | `String` | `string` | ✓ |
| `url_pattern` | `String` | `string` | ✓ |
| `captures` | `HashMap<String, String>` | `Record<string, string>` | ✓ |
| `tied_candidates` | `Vec<String>` | `string[]` | ✓ |

### Step 5: 모킹 정합성
`src/__mocks__/tauri-core.ts`의 mock이 Step 3-4와 일치하는지 확인.

### Step 6: invoke_handler 등록 검증
`src-tauri/src/lib.rs`의 `tauri::generate_handler![...]`에 변경된 command가 모두 등록되었는지 확인. 누락 시 호출 시 panic.

## 5. 자주 발생하는 결함 패턴

| 패턴 | 증상 | 원인 |
|---|---|---|
| 인자 키 불일치 | invoke 시 "command not found" 또는 "invalid args" | `start_download_by_url` Rust는 `url`인데 TS는 `targetUrl` 등 |
| serde rename 빠짐 | TS에서 필드 undefined | Rust struct에 `#[serde(rename_all = "camelCase")]` 있는데 TS는 snake_case |
| Option 처리 누락 | TS에서 `MatchResult` 인데 실제 null 들어옴 | Rust `Option<T>` → TS는 `T \| null` 필수 |
| invoke_handler 누락 | "command not registered" | lib.rs `generate_handler!` 갱신 빠짐 |
| 모킹 시그니처 drift | vitest 통과, 실제 dev에서 깨짐 | mock 인자/반환이 실제 변경 후 갱신 안 됨 |

## 6. 결함 발견 시 위임

| 결함 위치 | 책임 에이전트 |
|---|---|
| Rust 측 시그니처 | `rust-backend-engineer` |
| TS 측 invoke wrapper / 호출 | `frontend-engineer` |
| 모킹 정의 | `test-engineer` |
| invoke_handler 등록 누락 | `rust-backend-engineer` |

직접 수정하지 말고 `SendMessage`로 책임 에이전트에 보고. 1회 재요청 후에도 결함이 남으면 오케스트레이터에 에스컬레이션.

## 7. 빠른 smoke 검증 (opt-in, 기본 OFF)

`pnpm tauri dev` smoke는 **사용자가 dev 빌드 검증을 명시 요청한 경우에만** 실행한다. 매트릭스가 정합성을 정적으로 보장하므로 통상은 불필요. 매번 자동 시도하지 않는다 (실행 시간 + 환경 의존성 부담).

요청 시 절차:
```bash
pnpm tauri dev
# 브라우저 콘솔에서 직접 호출:
# await window.__TAURI__.core.invoke("find_sequence_by_url", { url: "https://example.com/test" });
```

매트릭스가 OK여도 dev에서 깨지면 정합성 결함이다.

## 8. 최종 단일 QA 게이트 (integration-qa 전용)

본 스킬을 사용하는 `integration-qa`는 모든 sub-agent 작업이 완료된 뒤 오케스트레이터가 1회 호출하는 최종 게이트다. 다음을 순서대로 실행하고 통합 결과를 보고한다:

```bash
# 1. 정합성 매트릭스 (정적, read-only) — 위 1~6장 절차

# 2. Rust 빌드 + 단위 테스트 (debug, release X)
cd src-tauri && cargo check
cd src-tauri && cargo test --lib

# 3. TS 타입 검사
pnpm tsc --noEmit

# 4. Vitest (전체)
pnpm test

# 5. (opt-in) perf 벤치
cd src-tauri && cargo test --release perf_

# 6. (opt-in) Playwright e2e
pnpm test:e2e
```

원칙:
- **debug 디폴트**: 일반 단위 테스트는 `--release` 없이. release는 perf 벤치만.
- **opt-in 5·6**: 사용자/오케스트레이터가 명시 요청 시만.
- **단 1회 호출**: Phase 중간 호출하지 않는다. 모든 작업 끝난 뒤 1회.

## 8. 보고 형식

오케스트레이터에 보고:
```
## 정합성 검증 결과

검증한 command: find_sequence_by_url, start_download_by_url, create_sequence, delete_sequence

### 매트릭스
[표 4개]

### 결함
- (없음) 또는
- 결함 위치 (file:line), 차이점, 책임 에이전트

### 결론
PASS / FAIL (책임 에이전트에 위임함)
```
