# Media Downloader

Tauri 2 (Rust) + React 19 + TypeScript + FSD 아키텍처 기반 미디어 다운로더.

## 하네스: URL 자동 매칭 구현

**목표:** `docs/url-auto-matching.md` 계획에 따라 selectbox 기반 시퀀스 선택을 URL 입력 자동 매칭으로 전환한다 (1만 시퀀스 200ms 보장 + react-toastify 토스트 UX).

**트리거:** "URL 자동 매칭", "url-auto-matching", "selectbox 제거", "시퀀스 자동 선택", "다시 실행", "이어서 작업", "보완" 등 관련 작업 요청 시 `url-auto-matching-orchestrator` 스킬을 사용하라. 단순 질문(예: "이 패턴이 뭐야?")은 직접 응답 가능.

**팀 구성 (참조):** `rust-backend-engineer` + `frontend-engineer` + `test-engineer` + `integration-qa` (4명, opus). 정의는 `.claude/agents/`, 도메인 스킬은 `.claude/skills/` 참조.

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-04-26 | 초기 구성 | 전체 | url-auto-matching 계획 수행을 위한 하네스 구축 |
| 2026-04-26 | url-auto-matching 1차 실행 완료 | sequence_index 모듈, find/start_download_by_url command, match-sequence feature, MediaToolbar 리팩터, react-toastify 통합, 테스트 84+36 | 계획 문서 docs/url-auto-matching.md 전체 구현 |
| 2026-04-26 | sequence-builder-ux 1차 실행 완료 | 멀티 윈도우(W1 시퀀스 편집/W2 셀렉터 픽커), URL 컨텍스트 메뉴, SelectorList(다중 셀렉터 + chip), 파일명 단순화 + 자동 마이그레이션, 테스트 114+60 | 계획 문서 docs/sequence-builder-ux.md 전체 구현 |
| 2026-05-05 | 하네스 경량화: 단일 최종 QA 게이트 | 모든 sub-agent(rust-backend/frontend/test-engineer)에서 cargo/tsc/vitest 자체 실행 제거, integration-qa가 최종 1회만 풀 검증 책임. release→debug 디폴트, e2e/perf opt-in. Phase별 중복 게이트 제거 | sub-task당 풀 빌드·테스트 누적 비용 회피 |
