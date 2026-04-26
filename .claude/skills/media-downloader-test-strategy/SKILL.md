---
name: media-downloader-test-strategy
description: 미디어 다운로더 프로젝트의 Rust 단위/통합 테스트, criterion 벤치마크, vitest 컴포넌트 테스트, Playwright e2e 테스트를 작성하거나 갱신할 때 사용한다. 1만 시퀀스 200ms 성능 검증, specificity 정렬 검증, Tauri invoke 모킹 패턴을 다룬다.
---

# media-downloader-test-strategy

URL 자동 매칭 기능의 테스트 전략과 작성 패턴.

## 1. 작업 시작 전 필수 확인

- `src-tauri/src/crawler/pattern.rs` — 기존 단위 테스트 패턴
- `src-tauri/Cargo.toml` — dev-dep (criterion 추가 가능 여부)
- `vitest.config.*`, `src/__tests__/setup.ts` — vitest 설정
- `src/__mocks__/tauri-core.ts` — invoke 모킹 패턴
- `src/features/manage-sequence/model/__tests__/useSequenceForm.test.ts` — 기존 hook 테스트 패턴
- `e2e/playwright.config.ts`, `e2e/*.spec.ts` — Playwright 시나리오

## 2. Rust 단위 테스트 (sequence_index/tests.rs)

### 2-1. 5가지 specificity 정렬 케이스

```rust
#[test]
fn specificity_literal_longer_wins() {
    let a = make_compiled("a", "https://example.com/posts/{id}/page");
    let b = make_compiled("b", "https://example.com/{*}");
    assert!(a.specificity > b.specificity);
}

#[test]
fn specificity_named_capture_beats_wildcard() {
    let a = make_compiled("a", "https://example.com/{id}.html");
    let b = make_compiled("b", "https://example.com/{*}.html");
    assert!(a.specificity > b.specificity);
}

#[test]
fn specificity_open_index_loses_to_closed() {
    let a = make_compiled("a", "https://example.com/page/{index:start=1,to=10}");
    let b = make_compiled("b", "https://example.com/page/{index:start=1}");
    assert!(a.specificity > b.specificity);
}

#[test]
fn specificity_different_host_filtered_out() {
    let mut idx = SequenceIndex::default();
    idx.upsert(&seq("a", "https://aa.com/{id}"));
    idx.upsert(&seq("b", "https://bb.com/{id}"));
    let r = idx.find_best("https://aa.com/123").unwrap();
    assert_eq!(r.sequence_name, "a");
}

#[test]
fn specificity_full_tie_is_deterministic() {
    let mut idx = SequenceIndex::default();
    idx.upsert(&seq("a", "https://example.com/{id}"));
    idx.upsert(&seq("b", "https://example.com/{slug}"));
    let first = idx.find_best("https://example.com/x").unwrap().sequence_name;
    for _ in 0..100 {
        assert_eq!(idx.find_best("https://example.com/x").unwrap().sequence_name, first);
    }
}
```

### 2-2. 0/1/N 후보 케이스

```rust
#[test]
fn find_best_no_match_returns_none() { /* ... */ }

#[test]
fn find_best_single_match_no_tied_candidates() { /* tied_candidates is empty */ }

#[test]
fn find_best_tied_lists_others() {
    let r = idx.find_best("...").unwrap();
    assert_eq!(r.tied_candidates.len(), 2);
}
```

### 2-3. regex 변환 동치성

기존 `match_and_capture`와 새 regex가 동일 캡처를 추출하는지:
```rust
#[test]
fn regex_extracts_same_captures_as_match_and_capture() {
    let pattern_str = "https://example.com/{id}/page/{*}";
    let parsed = parse_url_pattern(pattern_str).unwrap();
    let url = "https://example.com/42/page/foo";

    let legacy = match_and_capture(&parsed, url).unwrap();
    let regex = compile_to_regex(&parsed).0;
    let caps = regex.captures(url).unwrap();

    assert_eq!(legacy.get("id").unwrap(), caps.name("id").unwrap().as_str());
}
```

## 3. 성능 벤치마크 (200ms 보장)

### 3-1. criterion 도입

```toml
# Cargo.toml [dev-dependencies]
criterion = "0.5"

[[bench]]
name = "match_bench"
harness = false
```

```rust
// src-tauri/benches/match_bench.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_find_best_10k(c: &mut Criterion) {
    let idx = build_synthetic_index(100, 100); // 100 hosts × 100 patterns
    c.bench_function("find_best 10k worst-case", |b| {
        b.iter(|| idx.find_best(black_box("https://host50.example.com/posts/123/page/abc")))
    });
}

criterion_group!(benches, bench_find_best_10k);
criterion_main!(benches);
```

### 3-2. criterion 도입 부담 시 대안

`#[test]` 내 `Instant::now()`:
```rust
#[test]
fn perf_find_best_10k_under_5ms_p99() {
    let idx = build_synthetic_index(100, 100);
    let mut times = Vec::with_capacity(1000);
    for i in 0..1000 {
        let url = format!("https://host{}.example.com/posts/{}/page/x", i % 100, i);
        let t = Instant::now();
        let _ = idx.find_best(&url);
        times.push(t.elapsed().as_micros());
    }
    times.sort();
    let p99 = times[990];
    assert!(p99 < 5_000, "p99 = {}µs (target < 5000µs)", p99);
}
```

`cargo test --release -- perf_find_best_10k_under_5ms_p99` 로 실행.

### 3-3. 합성 데이터 생성

```rust
fn build_synthetic_index(host_count: usize, patterns_per_host: usize) -> SequenceIndex {
    let mut idx = SequenceIndex::default();
    for h in 0..host_count {
        for p in 0..patterns_per_host {
            let pat = format!("https://host{}.example.com/posts/{{id}}/page/{{*}}-{}", h, p);
            idx.upsert(&Sequence {
                meta: SequenceMeta { name: format!("h{}-p{}", h, p), /* ... */ },
                url_pattern: pat,
                /* ... */
            });
        }
    }
    idx
}
```

호스트 매칭률별 시나리오:
- 100% (worst case bucket = 100): 입력 URL을 합성 host에 명중
- 50%: 절반은 다른 host
- 1%: 거의 모두 다른 host (Stage 1에서 컷)

## 4. vitest 컴포넌트 테스트

### 4-1. 모킹 갱신

`src/__mocks__/tauri-core.ts` 신규 command 추가:
```ts
const mockInvoke = vi.fn(async (cmd: string, args: any) => {
  if (cmd === "find_sequence_by_url") {
    return mockFindSequenceByUrl(args.url);
  }
  if (cmd === "start_download_by_url") {
    return mockStartDownloadByUrl(args.url);
  }
  // ... 기존 mock
});
```

### 4-2. useMatchSequence 테스트

```ts
// src/features/match-sequence/model/__tests__/useMatchSequence.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { useMatchSequence } from "../useMatchSequence";

it("returns null for short urls", async () => {
  const { result } = renderHook(() => useMatchSequence("abc"));
  await waitFor(() => expect(result.current.data).toBeNull());
});

it("debounces calls and returns match", async () => {
  // mock invoke to return a fixed MatchResult
  const { result, rerender } = renderHook(({ url }) => useMatchSequence(url), {
    initialProps: { url: "" },
  });
  rerender({ url: "https://example.com/test" });
  await waitFor(() => expect(result.current.data).not.toBeNull(), { timeout: 500 });
  expect(result.current.data?.sequence_name).toBe("expected-seq");
});

it("cancels in-flight on rapid input", async () => {
  // verify older invoke result is dropped
});
```

### 4-3. MatchPreview 컴포넌트 테스트

```ts
it("renders matched name", () => {
  render(<MatchPreview matchedName="my-seq" tiedCandidates={[]} />);
  expect(screen.getByText(/my-seq/)).toBeInTheDocument();
});

it("shows +N badge when tied", () => {
  render(<MatchPreview matchedName="a" tiedCandidates={["b", "c"]} />);
  expect(screen.getByText(/\+2/)).toBeInTheDocument();
});
```

### 4-4. MediaToolbar.viewmodel 테스트

기존 `useSequenceForm.test.ts` 패턴 따름. 신규 흐름:
- url 입력 → useMatchSequence 트리거 → match 반환 시 `canStart = true`
- match 없을 때 toast.error 호출 검증 (`vi.mock("react-toastify")`)
- start 버튼 클릭 → `start_download_by_url` invoke 호출

## 5. Playwright e2e 갱신

### 5-1. 기존 selectbox 셀렉터 제거

```ts
// 변경 전
await page.locator("select").selectOption("my-seq");

// 변경 후 (URL 자동 매칭)
await page.locator('input[placeholder*="URL"]').fill("https://example.com/test");
await expect(page.locator("text=/매칭됨:/")).toBeVisible();
```

### 5-2. 신규 시나리오: 매칭 → 다운로드

```ts
test("URL 입력 시 자동 매칭 후 다운로드 시작", async ({ page }) => {
  // 시퀀스 1건 미리 등록 (fixture 또는 setup)
  await page.locator('input[placeholder*="URL"]').fill("https://example.com/posts/123");
  await expect(page.locator("text=/매칭됨/")).toBeVisible({ timeout: 1000 });
  await page.locator("button[aria-label='다운로드 시작']").click();
  await expect(page.locator("text=/scanning|downloading/")).toBeVisible();
});
```

### 5-3. 신규 시나리오: 매칭 실패 → toast → 시퀀스 만들기

```ts
test("매칭 실패 시 toast → 시퀀스 만들기 클릭 → 다이얼로그 prefill", async ({ page }) => {
  await page.locator('input[placeholder*="URL"]').fill("https://nonexistent.example/x");
  // toast 등장 대기
  await expect(page.locator("text=/매칭되는 시퀀스가 없습니다/")).toBeVisible({ timeout: 1000 });
  // toast 내 "시퀀스 만들기" 버튼 클릭
  await page.locator("text=시퀀스 만들기").click();
  // 다이얼로그 url_pattern 필드에 입력 URL이 prefill되었는지 확인
  const urlPatternField = page.locator('input[name="url_pattern"]');
  await expect(urlPatternField).toHaveValue("https://nonexistent.example/x");
});
```

## 6. 회귀 방지

- `src-tauri/src/crawler/pattern.rs`의 기존 단위 테스트는 변경 없이 통과해야 함. 변경 시 보고.
- `start_download` → `start_download_by_url` 교체 후, 기존 `start_download` 테스트는 **삭제 또는 갱신**. 호환 유지 안 함.
- `MediaToolbar` selectbox 관련 e2e는 모두 갱신.

## 7. 실행 명령어

```bash
# Rust
cd src-tauri && cargo test --lib
cd src-tauri && cargo test --release perf_  # 성능 테스트
cd src-tauri && cargo bench  # criterion (도입 시)

# 프론트
pnpm test          # vitest
pnpm test:e2e      # Playwright

# 전체
cd src-tauri && cargo check && cd .. && pnpm tsc --noEmit && pnpm test
```

## 8. 보고 형식

```
## 테스트 결과

### Rust 단위
- 작성: N개 / 통과: M개
- 깨진 케이스: [목록]

### 성능 벤치
- 시나리오 1 (100% match, bucket=100): p50=Xµs, p99=Yµs (목표: < 5000µs)
- 시나리오 2 (50% match): ...
- 시나리오 3 (1% match): ...

### vitest
- 작성: N개 / 통과: M개

### Playwright
- 시나리오: [목록] / 통과: M개

### 결론
PASS / FAIL (책임 에이전트에 위임)
```
