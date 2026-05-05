import { chromium } from "@playwright/test";

const url = process.argv[2];
const includeScreenshot = !process.argv.includes("--no-screenshot");

if (!url) {
  console.error("Usage: node scripts/render-page.mjs <url>");
  process.exit(2);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let total = 0;
      const step = Math.max(400, Math.floor(window.innerHeight * 0.75));
      const timer = setInterval(() => {
        const max = Math.max(
          document.body?.scrollHeight || 0,
          document.documentElement.scrollHeight || 0,
        );
        window.scrollBy(0, step);
        total += step;
        if (total >= max - window.innerHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 180);
    });
  });
  await sleep(700);
}

async function gotoWithRetry(page, targetUrl) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(900 * attempt);
    }
  }
  throw lastError;
}

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1600 },
    deviceScaleFactor: 1,
  });

  await gotoWithRetry(page, url);
  await page.waitForLoadState("networkidle", { timeout: 12_000 }).catch(() => undefined);
  await page.waitForFunction(() => document.readyState === "complete", null, {
    timeout: 10_000,
  }).catch(() => undefined);
  await sleep(1200);
  await autoScroll(page);

  const payload = await page.evaluate(() => {
    const cssEscape = (value) => {
      if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
      return String(value).replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);
    };

    const uniqueId = (el) => {
      if (!el.id) return false;
      try {
        return document.querySelectorAll(`#${cssEscape(el.id)}`).length === 1;
      } catch {
        return false;
      }
    };

    const buildSelector = (el) => {
      if (!el || el.nodeType !== 1) return "";
      if (uniqueId(el)) return `#${cssEscape(el.id)}`;
      const parts = [];
      let cur = el;
      while (cur && cur.nodeType === 1 && cur.tagName.toLowerCase() !== "html") {
        if (uniqueId(cur)) {
          parts.unshift(`#${cssEscape(cur.id)}`);
          break;
        }
        let seg = cur.tagName.toLowerCase();
        if (cur.classList && cur.classList.length) {
          seg += `.${Array.from(cur.classList).map(cssEscape).join(".")}`;
        }
        if (cur.parentElement) {
          const siblings = Array.from(cur.parentElement.children).filter(
            (c) => c.tagName === cur.tagName,
          );
          if (siblings.length > 1) seg += `:nth-of-type(${siblings.indexOf(cur) + 1})`;
        }
        parts.unshift(seg);
        cur = cur.parentElement;
      }
      return parts.join(" > ");
    };

    const mediaSource = (el) => {
      const tag = el.tagName.toLowerCase();
      if (tag === "img") return el.currentSrc || el.src || el.getAttribute("data-src") || null;
      if (tag === "video" || tag === "source") return el.currentSrc || el.src || null;
      if (tag === "a") return el.href || null;
      const bg = getComputedStyle(el).backgroundImage;
      const match = bg && bg.match(/url\(["']?(.*?)["']?\)/);
      return match ? match[1] : null;
    };

    const isMediaCandidate = (el) => {
      const tag = el.tagName.toLowerCase();
      if (["img", "video", "source"].includes(tag)) return true;
      const src = mediaSource(el) || "";
      return /\.(avif|gif|jpe?g|png|webp|bmp|mp4|webm|mov)(\?|#|$)/i.test(src);
    };

    const viewportWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body?.scrollWidth || 0,
      window.innerWidth,
    );
    const viewportHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body?.scrollHeight || 0,
      window.innerHeight,
    );

    const elements = Array.from(
      document.querySelectorAll('img, video, source, a[href], [style*="background-image"]'),
    )
      .filter(isMediaCandidate)
      .slice(0, 1500)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          selector: buildSelector(el),
          tag_name: el.tagName.toLowerCase(),
          source_url: mediaSource(el),
          rect: {
            x: r.left + window.scrollX,
            y: r.top + window.scrollY,
            width: r.width,
            height: r.height,
          },
        };
      })
      .filter((el) => el.selector && el.rect.width > 0 && el.rect.height > 0);

    return {
      html: document.documentElement.outerHTML,
      viewport_width: viewportWidth,
      viewport_height: viewportHeight,
      elements,
    };
  });

  const screenshot = includeScreenshot
    ? await page.screenshot({
        fullPage: true,
        type: "png",
        timeout: 30_000,
      })
    : null;

  process.stdout.write(
    JSON.stringify({
      render_id: "playwright",
      html: payload.html,
      snapshot_data_url: screenshot ? `data:image/png;base64,${screenshot.toString("base64")}` : null,
      viewport_width: payload.viewport_width,
      viewport_height: payload.viewport_height,
      elements: payload.elements,
    }),
  );
} finally {
  await browser.close();
}
