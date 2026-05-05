---
name: url-auto-matching-orchestrator
description: docs/url-auto-matching.md 계획에 따라 URL 자동 매칭 기능을 구현하는 오케스트레이터. selectbox 제거 + URL 입력만으로 시퀀스 자동 매칭, 200ms 성능 보장, react-toastify 토스트 UX 구현 전 과정을 4명 에이전트 팀(rust-backend-engineer, frontend-engineer, test-engineer, integration-qa)으로 자동 진행한다. "URL 자동 매칭", "url-auto-matching", "selectbox 제거", "시퀀스 자동 선택", "다시 실행", "재실행", "이어서 작업", "보완" 같은 요청 시 반드시 이 스킬을 사용한다.
---

# url-auto-matching-orchestrator

`docs/url-auto-matching.md` 계획을 4명 에이전트 팀으로 실행하는 오케스트레이터.

## 실행 모드

**에이전트 팀 (4명)**. `TeamCreate`로 팀 구성, `TaskCreate`로 작업 할당, `SendMessage`로 자체 조율.

| 에이전트 | 역할 | 사용 스킬 |
|---|---|---|
| `rust-backend-engineer` | sequence_index 모듈, regex 변환, AppState 통합, Tauri command | `rust-tauri-patterns` |
| `frontend-engineer` | match-sequence feature, MediaToolbar 리팩터, ViewModel, react-toastify | `fsd-react-patterns` |
| `test-engineer` | Rust 단위/벤치, vitest, Playwright e2e | `media-downloader-test-strategy` |
| `integration-qa` | Tauri command ↔ TS invoke 정합성 검증 | `tauri-boundary-qa` |

## Phase 0: 컨텍스트 확인 (필수 첫 단계)

워크플로우 시작 시 다음을 확인하여 실행 모드를 결정한다:

1. `_workspace/` 디렉토리(`.omc/workspace/url-auto-matching/`) 존재 여부
2. 기존 산출물 (Rust 모듈, 프론트 feature) 존재 여부
3. 사용자 요청이 "전체 실행" / "부분 재실행" / "보완" / "초기" 중 어디인지

| 상황 | 모드 | 행동 |
|---|---|---|
| `_workspace/` 미존재 + 산출물 없음 | **초기 실행** | Phase 1부터 전체 |
| `_workspace/` 존재 + 사용자 부분 수정 요청 | **부분 재실행** | 해당 에이전트만 재호출, 다른 산출물 유지 |
| `_workspace/` 존재 + 사용자 전체 재실행 | **전체 재실행** | 기존 `_workspace/`를 `_workspace_prev/`로 백업 후 Phase 1부터 |
| 일부 산출물만 존재 (이전 세션 중단) | **이어서 실행** | 마지막 완료 Phase 다음부터 |

`_workspace/` 위치: `/Users/univdev/Documents/media-downloader/.omc/workspace/url-auto-matching/`

## Phase 1: 사전 분석

오케스트레이터(메인) 단독 실행. 다음을 확인:

1. `docs/url-auto-matching.md` 읽기 (전체)
2. 현재 코드 상태 빠른 확인:
   - `src-tauri/src/lib.rs` (AppState, invoke_handler 현황)
   - `src-tauri/src/commands/sequence.rs`, `download.rs` (기존 command)
   - `src/widgets/media-toolbar/ui/MediaToolbar.tsx` + viewmodel (selectbox 존재 확인)
   - `package.json` (react-toastify 설치 여부)
3. 부분 변경 상태인지 (이전 실행 흔적) 확인

산출물: 현재 상태 요약을 `_workspace/00_baseline.md`에 저장.

## Phase 2: 팀 구성 + 백엔드 골격 + 프론트엔드 의존성 (병렬)

`TeamCreate`로 4명 팀 구성. 첫 작업 할당:

### 작업 A — rust-backend-engineer
- 신규 모듈 생성: `src-tauri/src/sequence_index/{mod.rs, regex_compile.rs, specificity.rs}`
- `lib.rs`에 `mod sequence_index;` 추가, `AppState.sequence_index: Arc<RwLock<SequenceIndex>>` 필드 추가
- setup에서 `SequenceIndex::build(sequences_dir)` 호출
- 산출물: `_workspace/10_backend_skeleton.md` (생성된 파일 목록 + struct 시그니처)
- **빌드 검증 X** — cargo check / cargo test는 호출하지 않는다. 모든 검증은 Phase 6 단일 QA 게이트에서.

### 작업 B — frontend-engineer (병렬)
- `pnpm add react-toastify` 설치
- `src/main.tsx`에 `<ToastContainer position="bottom-right" />` 마운트 + CSS import
- `src/features/match-sequence/` 디렉토리 + 빈 파일 스캐폴딩 (`api/`, `model/`, `ui/`, `index.ts`)
- 산출물: `_workspace/11_frontend_deps.md` (설치 확인 + 디렉토리 트리)

데이터 전달: 둘 다 완료 신호를 오케스트레이터에 → 다음 Phase 진행.

## Phase 3: Tauri Command 추가/교체 + 프론트 API/훅 작성

### 작업 C — rust-backend-engineer
- `commands/sequence.rs`에 `find_sequence_by_url` command 추가 + `MatchResult` struct
- `commands/download.rs`의 `start_download` → `start_download_by_url` 교체 (이전 함수 제거)
- `commands/sequence.rs`의 `create_sequence`/`delete_sequence`에 `state: State<'_, AppState>` 인자 추가 + `state.sequence_index.write().await.upsert/remove(...)` 호출
- `lib.rs` `invoke_handler` 갱신: 기존 `start_download` 제거, `start_download_by_url` + `find_sequence_by_url` 추가
- 산출물: `_workspace/20_backend_commands.md` (command 시그니처 표 — TS 측이 사용)
- **빌드 검증 X** — Phase 6 단일 QA 게이트에서 일괄 실행.

### 작업 D — frontend-engineer (작업 C 완료 후 시작)
- `src/features/match-sequence/api/findSequenceByUrl.ts` 작성
- `src/features/match-sequence/model/types.ts` 작성 (`MatchResult` interface — 작업 C 산출물 참조)
- `src/features/match-sequence/model/useDebounce.ts` 작성
- `src/features/match-sequence/model/useMatchSequence.ts` 작성
- `src/features/match-sequence/ui/MatchPreview.tsx` 작성
- `src/features/match-sequence/index.ts` re-export
- `src/features/start-download/api/` 의 기존 `startDownload.ts`를 `startDownloadByUrl.ts`로 교체
- `src/features/start-download/model/useStartDownload.ts` 시그니처 변경
- 산출물: `_workspace/21_frontend_api.md` (생성 파일 + 호출하는 invoke 목록)
- **빌드 검증 X** — Phase 6 단일 QA 게이트에서 일괄 실행.

## Phase 4: (제거됨)

기존 Phase 4 (중간 정합성 매트릭스 게이트)는 비효율로 제거되었다. 모든 정합성 검증과 빌드/테스트 실행은 모든 작업이 끝난 뒤 Phase 6의 **단일 최종 QA 게이트**에서 통합 실행한다. Phase별 cargo/tsc 호출이 누적되는 비용을 회피한다.

## Phase 5: UI 통합 + 테스트 (병렬)

### 작업 F — frontend-engineer
- `src/widgets/media-toolbar/ui/MediaToolbar.tsx` 리팩터: `<select>` 및 관련 props 제거, `<MatchPreview />` 통합
- `src/widgets/media-toolbar/ui/MediaToolbar.viewmodel.ts` 재작성: useMatchSequence + toast 트리거 로직
- `src/pages/home/ui/HomePage.tsx` MediaToolbar props 갱신
- `useSequenceDialogStore` 또는 기존 dialog 메커니즘 활용한 prefill 연동
- `SequenceDialog`/`useSequenceForm`에 `urlPatternSeed?: string` prop 추가
- 산출물: `_workspace/40_ui_refactor.md`

### 작업 G — test-engineer (병렬)
- `src-tauri/src/sequence_index/tests.rs` 작성: 5가지 specificity 케이스 + 0/1/N 후보 + regex 동치성
- 성능 벤치: criterion 도입 또는 `Instant::now()` 기반 1만 시퀀스 p99 < 5ms 검증
- `src/__mocks__/tauri-core.ts`에 신규 command 모킹 추가
- `src/features/match-sequence/model/__tests__/` vitest 테스트
- `e2e/` Playwright 시나리오 갱신: selectbox 셀렉터 제거 + 매칭/실패 시나리오 추가
- 산출물: `_workspace/41_tests.md` (테스트 결과 + 벤치 수치)

## Phase 6: 단일 최종 QA 게이트 + 사용자 보고

**핵심**: 모든 sub-agent (rust-backend / frontend / test-engineer)가 작업을 끝낸 뒤 오케스트레이터가 `integration-qa` 에이전트를 **단 한 번** 호출. 이 호출이 정합성 매트릭스 + 풀 빌드 + 풀 테스트를 모두 책임진다.

### 작업 H — integration-qa (단일 호출)
오케스트레이터는 다음 입력으로 integration-qa를 1회 호출:
- 작업 A·C 산출물 (Rust 시그니처 표)
- 작업 D 산출물 (TS invoke 호출 목록)
- 작업 G 산출물 (작성된 테스트 파일 + 모킹 정의)

integration-qa가 일괄 수행 (debug 디폴트, release/e2e는 opt-in):
1. 정합성 매트릭스 (정적, read-only) — 4 command + MatchResult 필드 + invoke_handler 등록 누락
2. `cd src-tauri && cargo check`
3. `cd src-tauri && cargo test --lib`
4. `pnpm tsc --noEmit`
5. `pnpm test` (vitest)
6. (opt-in) `cargo test --release perf_` — 성능 검증 명시 요청 시
7. (opt-in) `pnpm test:e2e` — e2e 명시 요청 시

산출물: `_workspace/50_final_qa.md` (매트릭스 + 빌드 결과 + 테스트 카운트 + PASS/FAIL 결론).

### 오케스트레이터 종합
- integration-qa 보고를 받아 사용자에게 단일 요약 (PASS/FAIL + 카운트 + 매트릭스 발췌)
- 결함 있을 시 책임 에이전트에 1회 수정 사이클 → 재호출
- 수동 검증 가이드 (계획 문서 11.4) 안내
- `TeamDelete`로 팀 정리

## 데이터 전달 프로토콜

| 전략 | 용도 |
|---|---|
| **태스크 기반** (`TaskCreate`/`TaskUpdate`) | Phase별 작업 할당, 의존성 (작업 D blockedBy 작업 C 등) |
| **파일 기반** (`_workspace/{nn}_{agent}_{artifact}.md`) | 산출물 (시그니처 표, 매트릭스, 테스트 결과) |
| **메시지 기반** (`SendMessage`) | 정합성 결함 즉시 통보, 시그니처 변경 신호 |

작업 디렉토리: `/Users/univdev/Documents/media-downloader/.omc/workspace/url-auto-matching/`

## 에러 핸들링

빌드/테스트 실패는 Phase 6 단일 QA 게이트에서 1회 검출되며, 책임 에이전트에 1 사이클만 위임한다.

| 에러 유형 | 전략 |
|---|---|
| Phase 6: `cargo check`/`cargo test --lib` 실패 | integration-qa → rust-backend-engineer 1회 위임. 재실패 시 사용자 보고. |
| Phase 6: `pnpm tsc --noEmit`/vitest 실패 | integration-qa → frontend-engineer 또는 test-engineer 1회 위임. 재실패 시 사용자 보고. |
| Phase 6: 정합성 매트릭스 결함 | integration-qa → 책임 에이전트(rust/frontend/test) SendMessage. 1회 후 잔존 시 에스컬레이션. |
| 200ms 미달 (opt-in perf 검증) | integration-qa가 rust-backend에 알림. 인덱스 구조 재검토. |
| 외부 dep 설치 실패 (react-toastify 등) | 사용자에게 즉시 보고. |

## 모델 설정

모든 Agent 호출에 `model: "opus"` 명시. 하네스 품질이 추론 능력에 직결됨.

## 후속 작업 지원

사용자 후속 요청 키워드 (description에도 포함):
- "URL 자동 매칭 다시 실행", "재실행", "이어서 작업"
- "selectbox 제거 부분만", "백엔드만", "테스트만 다시"
- "보완", "수정", "개선"
- "이전 결과 기반으로"

각 에이전트 정의에 "이전 산출물 존재 시 읽고 개선점 반영" 지침 명시. 부분 재실행 시 해당 에이전트만 재호출하고 `_workspace/` 보존.

## 테스트 시나리오

### 정상 흐름
1. 사용자: "url-auto-matching.md 계획 실행해줘"
2. Phase 0: `_workspace/` 미존재 → 초기 실행
3. Phase 1-6 순차 진행
4. 최종 빌드/테스트 통과 → 사용자에게 수동 검증 가이드 보고
5. 작업 디렉토리 + CLAUDE.md 변경 이력 갱신

### 에러 흐름 (정합성 결함)
1. Phase 4에서 integration-qa가 `start_download_by_url` Rust는 `url`인데 TS는 `targetUrl`로 호출 발견
2. SendMessage로 frontend-engineer에 통보
3. frontend-engineer가 `startDownloadByUrl.ts` 수정
4. integration-qa 재검증 → PASS
5. Phase 5 진행

### 부분 재실행 흐름
1. 사용자: "frontend 부분만 다시 작업해줘"
2. Phase 0: `_workspace/` 존재 → 부분 재실행
3. frontend-engineer만 재호출 (Phase 3-D, Phase 5-F)
4. integration-qa 재검증
5. test-engineer는 영향받는 vitest/e2e만 재실행

## 산출물 체크리스트

- [ ] `_workspace/00_baseline.md` (현재 상태)
- [ ] `_workspace/10_backend_skeleton.md` (Rust 모듈 골격)
- [ ] `_workspace/11_frontend_deps.md` (react-toastify + 디렉토리)
- [ ] `_workspace/20_backend_commands.md` (command 시그니처 표)
- [ ] `_workspace/21_frontend_api.md` (invoke wrapper 목록)
- [ ] `_workspace/30_qa_matrix.md` (1차 정합성)
- [ ] `_workspace/40_ui_refactor.md` (UI 변경)
- [ ] `_workspace/41_tests.md` (테스트 + 벤치)
- [ ] `_workspace/50_final_qa.md` (최종 정합성)
- [ ] CLAUDE.md 변경 이력에 실행 기록 추가
