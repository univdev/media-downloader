import { useCallback, useEffect, useMemo, useState } from "react";
import { emit, emitTo } from "@tauri-apps/api/event";
import {
  fetchHtml,
  fetchRenderedPage,
  prettifyHtml,
  closeWindow,
  type RenderedElement,
  type RenderedPagePayload,
} from "@/features/manage-sequence";
import { buildSelector } from "./buildSelector";
import { buildLineIndex } from "./lineToElement";
import { isMinified } from "./detectMinified";
import { parseLocationHash, type ParsedHash } from "./parseLocationHash";

export type SelectorPickerStep = "input" | "loading" | "ready" | "error";
export type SelectorPickerTab = "html" | "snapshot";

const MAX_LINE_COUNT = 50_000;

interface SelectedItem {
  line: number | null;
  selector: string;
}

function getCurrentLabel(): string {
  if (typeof window === "undefined") return "selector-picker";
  // Tauri 윈도우 라벨은 일반적으로 location 의 search 또는 자체 API에서 옴.
  // 여기서는 webviewWindow API 를 try-catch 로 감싸 fallback.
  try {
    // dynamic import 를 회피하기 위해 globalThis 의 __TAURI 흔적 활용
    const w = window as unknown as { __TAURI_METADATA__?: { __currentWindow?: { label: string } } };
    return w.__TAURI_METADATA__?.__currentWindow?.label ?? "selector-picker";
  } catch {
    return "selector-picker";
  }
}

export function useSelectorPickerViewModel() {
  const [hash] = useState<ParsedHash>(() =>
    parseLocationHash(typeof window !== "undefined" ? window.location.hash : "", getCurrentLabel()),
  );

  const [step, setStep] = useState<SelectorPickerStep>("input");
  const [url, setUrl] = useState("");
  const [rawHtml, setRawHtml] = useState("");
  const [displayHtml, setDisplayHtml] = useState("");
  const [isPretty, setIsPretty] = useState(false);
  const [isPrettifying, setIsPrettifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [renderedPage, setRenderedPage] = useState<RenderedPagePayload | null>(null);
  const [activeTab, setActiveTab] = useState<SelectorPickerTab>("html");
  const [selected, setSelected] = useState<SelectedItem[]>([]);

  const lineIndex = useMemo(() => buildLineIndex(displayHtml), [displayHtml]);
  const lineCount = useMemo(() => displayHtml.split("\n").length, [displayHtml]);
  const tooLarge = lineCount > MAX_LINE_COUNT;

  const selectedLineSet = useMemo(
    () => new Set(selected.flatMap((s) => (s.line === null ? [] : [s.line]))),
    [selected],
  );

  const handleConfirmUrl = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("URL을 입력해주세요.");
      return;
    }
    setError(null);
    setRenderError(null);
    setRenderedPage(null);
    setActiveTab("html");
    setStep("loading");
    try {
      let html: string;
      try {
        const rendered = await fetchRenderedPage(trimmed);
        setRenderedPage(rendered);
        html = rendered.html;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setRenderError(`렌더링 스냅샷을 가져오지 못했습니다: ${message}`);
        html = await fetchHtml(trimmed);
      }
      setRawHtml(html);
      const minified = isMinified(html);
      if (minified) {
        try {
          setIsPrettifying(true);
          const pretty = await prettifyHtml(html);
          setDisplayHtml(pretty);
          setIsPretty(true);
        } catch {
          setDisplayHtml(html);
          setIsPretty(false);
        } finally {
          setIsPrettifying(false);
        }
      } else {
        setDisplayHtml(html);
        setIsPretty(false);
      }
      setSelected([]);
      setStep("ready");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(`HTML을 가져오지 못했습니다: ${message}`);
      setStep("error");
    }
  }, [url]);

  const handleRetry = useCallback(() => {
    setError(null);
    setStep("input");
  }, []);

  const handleTogglePretty = useCallback(async () => {
    if (isPretty) {
      setDisplayHtml(rawHtml);
      setIsPretty(false);
      setSelected([]);
      return;
    }
    try {
      setIsPrettifying(true);
      const pretty = await prettifyHtml(rawHtml);
      setDisplayHtml(pretty);
      setIsPretty(true);
      setSelected([]);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(`HTML 정리에 실패했습니다: ${message}`);
    } finally {
      setIsPrettifying(false);
    }
  }, [isPretty, rawHtml]);

  const handleLineClick = useCallback(
    (lineNo: number) => {
      const el = lineIndex.get(lineNo);
      if (!el) return;
      setSelected((prev) => {
        const existingIdx = prev.findIndex((s) => s.line === lineNo);
        if (existingIdx >= 0) {
          return prev.filter((_, i) => i !== existingIdx);
        }
        const selector = buildSelector(el);
        if (!selector) return prev;
        return [...prev, { line: lineNo, selector }];
      });
    },
    [lineIndex],
  );

  const handleRenderedElementClick = useCallback((element: RenderedElement) => {
    setSelected((prev) => {
      const existingIdx = prev.findIndex((s) => s.selector === element.selector);
      if (existingIdx >= 0) {
        return prev.filter((_, i) => i !== existingIdx);
      }
      return [...prev, { line: null, selector: element.selector }];
    });
  }, []);

  const handleRemoveSelected = useCallback((idx: number) => {
    setSelected((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleConfirm = useCallback(async () => {
    if (selected.length === 0) return;
    const value = selected.map((s) => s.selector).join(", ");
    const payload = {
      target: hash.target,
      value,
    };
    try {
      if (hash.parent) {
        await emitTo(hash.parent, "selector-picked", payload);
      }
      await emit("selector-picked", payload);
    } finally {
      try {
        await closeWindow(hash.windowLabel);
      } catch {
        // 폴백: 창 닫기 실패 시 조용히 무시 (테스트 환경 등).
      }
    }
  }, [hash.parent, hash.target, hash.windowLabel, selected]);

  const handleCancel = useCallback(async () => {
    try {
      await closeWindow(hash.windowLabel);
    } catch {
      // 무시
    }
  }, [hash.windowLabel]);

  // unmount cleanup placeholder
  useEffect(() => () => undefined, []);

  return {
    target: hash.target,
    parent: hash.parent,
    step,
    url,
    setUrl,
    error,
    renderError,
    renderedPage,
    activeTab,
    setActiveTab,
    displayHtml,
    lineIndex,
    lineCount,
    tooLarge,
    isPretty,
    isPrettifying,
    selected,
    selectedLineSet,
    selectedSelectors: selected.map((s) => s.selector),
    handleConfirmUrl,
    handleRetry,
    handleTogglePretty,
    handleLineClick,
    handleRenderedElementClick,
    handleRemoveSelected,
    handleConfirm,
    handleCancel,
  };
}
