import { test, expect } from "@playwright/test";

/**
 * 시퀀스 빌더 UX (멀티 윈도우) e2e 시나리오.
 *
 * 운용 전제 + 실행 보류 사유:
 *   - Tauri WebviewWindow 멀티 윈도우는 Playwright 단일 page 컨텍스트에서
 *     자동화하기 어렵다 (W1, W2 가 OS 레벨로 별도 윈도우).
 *   - 현재 환경에 Playwright 브라우저(Chromium) 미설치 + dev 서버 자동 기동
 *     인프라 부재 → 실행은 보류한다.
 *   - 본 spec 은 "메인 페이지에서 시퀀스 만들기 클릭 → openSequenceEditor
 *     invoke 가 호출되는지" 만 mock 으로 검증하고, 실제 W1 윈도우 내부
 *     동작은 hash url 직접 진입 또는 수동 검증으로 확인한다 (manual_verification.md).
 *
 * 본 파일은 "코드만 작성, 환경이 갖춰지면 그대로 실행" 정책이다.
 */

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:1420";

test.describe("시퀀스 빌더 (멀티 윈도우 — 실행 보류, mock 기반)", () => {
  test.beforeEach(async ({ page }) => {
    // Tauri invoke 를 가로채 호출 인자만 기록 (실제 윈도우는 열리지 않음).
    await page.addInitScript(() => {
      const calls: Array<{ cmd: string; args: unknown }> = [];
      // @ts-expect-error injected for test
      window.__TEST_INVOKES__ = calls;
      // @ts-expect-error injected for test
      window.__TAURI_INTERNALS__ = {
        invoke: async (cmd: string, args: unknown) => {
          calls.push({ cmd, args });
          if (cmd === "list_sequences") return [];
          if (cmd === "find_sequence_by_url") return null;
          // open_sequence_editor / open_selector_picker / close_window 모두
          // 단순히 ack 반환 (Playwright 단일 page 에서는 윈도우 안 열림)
          return undefined;
        },
      };
    });
  });

  test("메인 → 새 시퀀스 클릭 → open_sequence_editor invoke 호출", async ({
    page,
  }) => {
    await page.goto(BASE_URL);

    // 시퀀스 관리 / 새 시퀀스 버튼 (UI 라벨에 따라 조정)
    const openBtn = page.getByRole("button", {
      name: /새 시퀀스|시퀀스 만들기|시퀀스 관리/,
    });
    await expect(openBtn.first()).toBeVisible({ timeout: 5000 });
    await openBtn.first().click();

    // SequenceListDialog 가 열린 경우 그 안의 "새 시퀀스" 버튼도 시도.
    const newSeqInDialog = page.getByRole("button", { name: /새 시퀀스/ });
    if (await newSeqInDialog.count()) {
      await newSeqInDialog.first().click();
    }

    const calls = await page.evaluate(
      // @ts-expect-error injected
      () => window.__TEST_INVOKES__ as Array<{ cmd: string }>,
    );
    expect(
      calls.some((c) => c.cmd === "open_sequence_editor"),
      `open_sequence_editor should have been invoked. calls=${JSON.stringify(calls)}`,
    ).toBeTruthy();
  });

  test("SequenceEditorPage hash 진입 → 폼 필드 노출 + 파일명 섹션 부재", async ({
    page,
  }) => {
    // W1 페이지를 단일 윈도우로 직접 진입.
    await page.goto(`${BASE_URL}/#/sequence-editor`);

    // url_pattern 필드는 존재
    const urlPattern = page.getByPlaceholder(/url|pattern|패턴/i).first();
    await expect(urlPattern).toBeVisible({ timeout: 5000 });

    // "다운받을 미디어 요소" 섹션 (CSS 셀렉터 대체 라벨) 존재
    const mediaLabel = page.getByText(/다운받을 미디어 요소/);
    await expect(mediaLabel).toBeVisible();

    // 파일명 섹션은 모델 단순화 후 제거됨 → "파일명" 텍스트가 폼에 없어야
    // 한다. (단, "파일" 단어가 다른 라벨에 들어갈 가능성은 있으니
    // 정확 일치 정규식으로 한정.)
    const fileNameSection = page.getByText(/^파일명$/);
    await expect(fileNameSection).toHaveCount(0);
  });
});
