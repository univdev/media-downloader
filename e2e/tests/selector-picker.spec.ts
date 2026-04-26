import { test, expect } from "@playwright/test";

/**
 * SelectorPickerPage(W2) 단일 윈도우 시나리오.
 *
 * 운용 전제:
 *   - dev 서버가 `pnpm dev` (또는 `pnpm tauri dev`)로 떠 있을 것.
 *   - 본 spec 은 Tauri 윈도우를 직접 띄우지 않고, hash url 직접 진입으로
 *     SelectorPickerPage 컴포넌트만 격리 검증한다.
 *   - `invoke("fetch_html")` 는 Tauri 백엔드 호출이라 브라우저에서는
 *     실행 불가 → window.__TAURI_INTERNALS__ mock 으로 가로채야 한다.
 *
 * 실행 보류 사유:
 *   1. 현재 CI/로컬 환경에 Playwright 브라우저(Chromium 등)가 미설치.
 *   2. dev 서버 자동 기동 + Tauri runtime 모킹 인프라 부재.
 *   3. emit/listen 멀티 윈도우 흐름은 Playwright 단일 페이지로 검증 불가.
 *
 * 따라서 본 파일은 "코드만 작성, 실행은 수동 검증 또는 후속 인프라
 * 정비 후" 정책이다. spec 자체는 Playwright runner 가 인식할 수 있는
 * 형태로 유지되며, 환경이 갖춰지면 별도 변경 없이 동작해야 한다.
 */

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:1420";

const HTML_FIXTURE = `
<!doctype html>
<html>
  <body>
    <div class="gallery">
      <img src="/img/1.jpg" />
      <img src="/img/2.jpg" />
    </div>
    <h1 class="title">Test Album</h1>
  </body>
</html>
`.trim();

test.describe("SelectorPicker (단일 윈도우 시나리오 — 실행 보류)", () => {
  test.beforeEach(async ({ page }) => {
    // Tauri invoke + emit 을 브라우저 내에서 스텁.
    // 실제 환경에서는 @tauri-apps/api 가 window.__TAURI_INTERNALS__ 를
    // 통해 IPC 를 수행한다.
    await page.addInitScript((html: string) => {
      const calls: Array<{ cmd: string; args: unknown }> = [];
      // @ts-expect-error injected for test
      window.__TEST_INVOKES__ = calls;
      // @ts-expect-error injected for test
      window.__TAURI_INTERNALS__ = {
        invoke: async (cmd: string, args: unknown) => {
          calls.push({ cmd, args });
          if (cmd === "fetch_html") return html;
          if (cmd === "prettify_html") return html;
          if (cmd === "close_window") return undefined;
          return undefined;
        },
      };
    }, HTML_FIXTURE);
  });

  test("hash url 진입 → URL 입력 → 라인 표시 → 라인 클릭 → 사이드바 노출", async ({
    page,
  }) => {
    // SelectorPickerPage 진입.
    // hash query 로 target/parent/label 을 주입한다.
    await page.goto(
      `${BASE_URL}/#/selector-picker?target=media&parent=sequence-editor&label=selector-picker`,
    );

    // 1. URL input 화면
    const urlInput = page.getByPlaceholder(/url|예시|예제/i);
    await expect(urlInput).toBeVisible({ timeout: 5000 });
    await urlInput.fill("https://example.com/album/1");

    // 2. 확인 → fetch_html mock 호출 → ready step
    await page.getByRole("button", { name: /확인|OK/ }).first().click();

    // 3. 라인 표시 (라인 번호 칼럼) — 2번 라인에 <body> 가 포함되어야 함.
    const sourceView = page.locator("[data-line]");
    await expect(sourceView.first()).toBeVisible({ timeout: 5000 });

    // 4. <img> 가 포함된 라인 클릭 → 사이드바에 셀렉터 추가
    const imgLine = page.locator("[data-line]", {
      hasText: /img/,
    }).first();
    await imgLine.click();

    // 사이드바 카운트 표시 — "확인 (1)" 같은 라벨
    await expect(page.getByText(/\(1\)/)).toBeVisible({ timeout: 2000 });

    // 5. 확인 → emitTo + close_window invoke 호출 흐름
    await page.getByRole("button", { name: /확인 \(/ }).click();

    // close_window 가 호출됐는지 mock 큐 확인
    const calls = await page.evaluate(
      // @ts-expect-error injected
      () => window.__TEST_INVOKES__ as Array<{ cmd: string }>,
    );
    expect(calls.some((c) => c.cmd === "close_window")).toBeTruthy();
  });

  test("URL 미입력 상태에서는 확인 버튼이 비활성", async ({ page }) => {
    await page.goto(
      `${BASE_URL}/#/selector-picker?target=media&parent=sequence-editor&label=selector-picker`,
    );
    const confirmBtn = page.getByRole("button", { name: /확인|OK/ }).first();
    await expect(confirmBtn).toBeDisabled();
  });
});
