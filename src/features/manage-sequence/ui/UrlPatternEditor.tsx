import { useCallback, useRef, useState } from "react";
import { ContextMenu } from "@base-ui/react/context-menu";
import {
  replaceRange,
  toVariableToken,
  toIndexToken,
  toWildcardToken,
} from "../model/urlTokens";

interface UrlPatternEditorProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

type PromptKind = "variable" | "index" | null;

export function UrlPatternEditor({ value, error, onChange }: UrlPatternEditorProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selection, setSelection] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });
  const [promptKind, setPromptKind] = useState<PromptKind>(null);
  const [variableName, setVariableName] = useState("");
  const [indexStart, setIndexStart] = useState("1");
  const [indexTo, setIndexTo] = useState("");

  const captureSelection = useCallback(() => {
    const el = inputRef.current;
    if (!el) return { start: 0, end: 0 };
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    setSelection({ start, end });
    return { start, end };
  }, []);

  const hasSelection = selection.end > selection.start;
  const selectedText = value.slice(selection.start, selection.end);

  const replaceSelection = useCallback(
    (replacement: string) => {
      const next = replaceRange(value, selection.start, selection.end, replacement);
      onChange(next);
      // restore caret after replacement
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (!el) return;
        const caret = selection.start + replacement.length;
        el.focus();
        el.setSelectionRange(caret, caret);
      });
    },
    [value, selection, onChange],
  );

  const handleCut = useCallback(async () => {
    if (!hasSelection) return;
    try {
      await navigator.clipboard.writeText(selectedText);
    } catch {
      /* ignore clipboard errors */
    }
    replaceSelection("");
  }, [hasSelection, selectedText, replaceSelection]);

  const handleCopy = useCallback(async () => {
    if (!hasSelection) return;
    try {
      await navigator.clipboard.writeText(selectedText);
    } catch {
      /* ignore */
    }
  }, [hasSelection, selectedText]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      replaceSelection(text);
    } catch {
      /* ignore */
    }
  }, [replaceSelection]);

  const handleSelectAll = useCallback(() => {
    inputRef.current?.select();
  }, []);

  const openVariablePrompt = useCallback(() => {
    setVariableName("");
    setPromptKind("variable");
  }, []);

  const openIndexPrompt = useCallback(() => {
    setIndexStart("1");
    setIndexTo("");
    setPromptKind("index");
  }, []);

  const handleConfirmVariable = useCallback(() => {
    const trimmed = variableName.trim();
    if (!trimmed) return;
    replaceSelection(toVariableToken(trimmed));
    setPromptKind(null);
  }, [variableName, replaceSelection]);

  const handleConfirmIndex = useCallback(() => {
    const startNum = Number.parseInt(indexStart, 10);
    if (Number.isNaN(startNum)) return;
    const toNum = indexTo.trim() === "" ? undefined : Number.parseInt(indexTo, 10);
    if (toNum !== undefined && Number.isNaN(toNum)) return;
    replaceSelection(toIndexToken(startNum, toNum));
    setPromptKind(null);
  }, [indexStart, indexTo, replaceSelection]);

  const handleWildcard = useCallback(() => {
    if (!hasSelection) return;
    replaceSelection(toWildcardToken());
  }, [hasSelection, replaceSelection]);

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">URL 패턴</label>
      <ContextMenu.Root>
        <ContextMenu.Trigger
          render={(props) => (
            <input
              {...props}
              ref={inputRef}
              type="text"
              className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground"
              placeholder="https://example.com/gallery/{index:start=1,to=10}"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onContextMenu={(e) => {
                captureSelection();
                props.onContextMenu?.(e);
              }}
            />
          )}
        />
        <ContextMenu.Portal>
          <ContextMenu.Positioner>
            <ContextMenu.Popup className="z-50 min-w-[180px] rounded-md border border-input bg-popover p-1 text-sm shadow-md">
              <ContextMenu.Item
                className="cursor-pointer rounded px-2 py-1 outline-none data-[highlighted]:bg-accent data-[disabled]:opacity-50"
                disabled={!hasSelection}
                onClick={handleCut}
              >
                잘라내기
              </ContextMenu.Item>
              <ContextMenu.Item
                className="cursor-pointer rounded px-2 py-1 outline-none data-[highlighted]:bg-accent data-[disabled]:opacity-50"
                disabled={!hasSelection}
                onClick={handleCopy}
              >
                복사
              </ContextMenu.Item>
              <ContextMenu.Item
                className="cursor-pointer rounded px-2 py-1 outline-none data-[highlighted]:bg-accent"
                onClick={handlePaste}
              >
                붙여넣기
              </ContextMenu.Item>
              <ContextMenu.Item
                className="cursor-pointer rounded px-2 py-1 outline-none data-[highlighted]:bg-accent"
                onClick={handleSelectAll}
              >
                모두 선택
              </ContextMenu.Item>
              <div className="my-1 h-px bg-border" />
              <ContextMenu.Item
                className="cursor-pointer rounded px-2 py-1 outline-none data-[highlighted]:bg-accent data-[disabled]:opacity-50"
                disabled={!hasSelection}
                onClick={openVariablePrompt}
              >
                변수로 변환
              </ContextMenu.Item>
              <ContextMenu.Item
                className="cursor-pointer rounded px-2 py-1 outline-none data-[highlighted]:bg-accent data-[disabled]:opacity-50"
                disabled={!hasSelection}
                onClick={openIndexPrompt}
              >
                인덱스로 변환
              </ContextMenu.Item>
              <ContextMenu.Item
                className="cursor-pointer rounded px-2 py-1 outline-none data-[highlighted]:bg-accent data-[disabled]:opacity-50"
                disabled={!hasSelection}
                onClick={handleWildcard}
              >
                와일드카드로 변환
              </ContextMenu.Item>
            </ContextMenu.Popup>
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>

      {promptKind === "variable" && (
        <div className="flex items-center gap-2 rounded-md border border-input bg-muted/30 p-2">
          <input
            type="text"
            autoFocus
            placeholder="변수명 (예: id)"
            className="h-7 flex-1 rounded-md border border-input bg-background px-2 text-xs"
            value={variableName}
            onChange={(e) => setVariableName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConfirmVariable();
              if (e.key === "Escape") setPromptKind(null);
            }}
          />
          <button
            type="button"
            className="h-7 rounded-md bg-primary px-2 text-xs text-primary-foreground"
            onClick={handleConfirmVariable}
          >
            적용
          </button>
          <button
            type="button"
            className="h-7 rounded-md bg-muted px-2 text-xs"
            onClick={() => setPromptKind(null)}
          >
            취소
          </button>
        </div>
      )}

      {promptKind === "index" && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-input bg-muted/30 p-2">
          <label className="text-xs">start</label>
          <input
            type="number"
            className="h-7 w-16 rounded-md border border-input bg-background px-2 text-xs"
            value={indexStart}
            onChange={(e) => setIndexStart(e.target.value)}
          />
          <label className="text-xs">to (선택)</label>
          <input
            type="number"
            className="h-7 w-16 rounded-md border border-input bg-background px-2 text-xs"
            value={indexTo}
            onChange={(e) => setIndexTo(e.target.value)}
          />
          <button
            type="button"
            className="h-7 rounded-md bg-primary px-2 text-xs text-primary-foreground"
            onClick={handleConfirmIndex}
          >
            적용
          </button>
          <button
            type="button"
            className="h-7 rounded-md bg-muted px-2 text-xs"
            onClick={() => setPromptKind(null)}
          >
            취소
          </button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        텍스트 드래그 후 우클릭으로 변수/인덱스/와일드카드 토큰으로 변환하세요.
      </p>
    </div>
  );
}
