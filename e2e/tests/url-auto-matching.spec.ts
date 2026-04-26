import { test, expect } from "@playwright/test";

/**
 * URL 자동 매칭 e2e 시나리오.
 *
 * 전제: dev 서버가 http://localhost:1420 에서 실행 중이고,
 *      `e2e/fixtures/test-sequence.json` 의 시퀀스가 1건 사전 등록되어 있어야 한다.
 *      (fixture import 자동화가 없다면 이 spec 들은 best-effort 로 skip 한다.)
 */

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:1420";

test.describe("URL 자동 매칭", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test("selectbox 가 더 이상 노출되지 않는다", async ({ page }) => {
    // 기존 시퀀스 select 드롭다운이 사라졌는지 확인
    const select = page.locator("select");
    await expect(select).toHaveCount(0);

    // URL 입력 placeholder 가 신규 시그니처(URL을 입력하세요...)인지 확인
    const urlInput = page.getByPlaceholder("URL을 입력하세요...");
    await expect(urlInput).toBeVisible();
  });

  test("URL 입력 → MatchPreview 표시 → ▶ 클릭 → DownloadProgress 노출", async ({
    page,
  }) => {
    // 사전 등록된 fixture 시퀀스의 url_pattern: https://example.com/gallery/{index:start=1,to=3}
    const urlInput = page.getByPlaceholder("URL을 입력하세요...");
    await urlInput.fill("https://example.com/gallery/1");

    // MatchPreview: "매칭됨" 라벨 노출 (디바운스 150ms + invoke 왕복 → 1.5s 안)
    await expect(page.getByText(/매칭됨/)).toBeVisible({ timeout: 2000 });

    // ▶ 다운로드 시작 버튼 활성화 후 클릭
    const startBtn = page.getByRole("button", { name: "다운로드 시작" });
    await expect(startBtn).toBeEnabled();
    await startBtn.click();

    // DownloadProgress 영역 노출 (scanning/downloading 등 상태 텍스트)
    await expect(page.locator("text=/scanning|downloading|pending/i")).toBeVisible({
      timeout: 5000,
    });
  });

  test("매칭 실패 시 toast 노출 + '시퀀스 만들기' 클릭 → SequenceDialog open + url_pattern prefill", async ({
    page,
  }) => {
    const NONEXISTENT = "https://nonexistent.example.test/some/path";

    const urlInput = page.getByPlaceholder("URL을 입력하세요...");
    await urlInput.fill(NONEXISTENT);

    // toast 본문이 등장
    await expect(page.getByText(/매칭되는 시퀀스가 없습니다/)).toBeVisible({
      timeout: 2000,
    });

    // toast 내 "시퀀스 만들기" 버튼 클릭
    await page.getByRole("button", { name: "시퀀스 만들기" }).click();

    // SequenceDialog (다이얼로그 제목 "새 시퀀스") 노출
    await expect(page.getByRole("heading", { name: "새 시퀀스" })).toBeVisible();

    // url_pattern 입력 필드에 입력 URL 이 prefill 되어 있는지 확인
    // UrlPatternInput 의 input 은 placeholder 또는 label 로 식별 (UrlPatternInput 컴포넌트 구조에 따라 조정)
    // 가장 안전한 방법: 다이얼로그 안에 prefill URL 값을 가진 input 이 있는지 검색
    const prefilled = page.locator(`input[value="${NONEXISTENT}"]`);
    await expect(prefilled.first()).toBeVisible();
  });
});
