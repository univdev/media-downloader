import { useEffect, useMemo, useRef, type MouseEvent } from "react";
import type { RenderedElement, RenderedPagePayload } from "@/features/manage-sequence";

interface SnapshotCanvasProps {
  page: RenderedPagePayload | null;
  selectedSelectors: string[];
  onElementClick: (element: RenderedElement) => void;
}

export function SnapshotCanvas({
  page,
  selectedSelectors,
  onElementClick,
}: SnapshotCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const selectedSet = useMemo(() => new Set(selectedSelectors), [selectedSelectors]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !page) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = Math.max(1, Math.min(page.viewport_width, 4096));
    const height = Math.max(1, Math.min(page.viewport_height, 8192));
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    const drawOverlays = () => {
      ctx.save();
      for (const el of page.elements) {
        const isSelected = selectedSet.has(el.selector);
        ctx.strokeStyle = isSelected ? "#16a34a" : "#2563eb";
        ctx.fillStyle = isSelected ? "rgba(22, 163, 74, 0.18)" : "rgba(37, 99, 235, 0.12)";
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.fillRect(el.rect.x, el.rect.y, el.rect.width, el.rect.height);
        ctx.strokeRect(el.rect.x, el.rect.y, el.rect.width, el.rect.height);
      }
      ctx.restore();
    };

    if (!page.snapshot_data_url) {
      ctx.fillStyle = "#f4f4f5";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#52525b";
      ctx.font = "14px sans-serif";
      ctx.fillText("스냅샷 이미지를 만들 수 없습니다. 후보 영역만 표시합니다.", 24, 32);
      drawOverlays();
      return;
    }

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      drawOverlays();
    };
    img.onerror = () => {
      ctx.fillStyle = "#f4f4f5";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#52525b";
      ctx.font = "14px sans-serif";
      ctx.fillText("스냅샷 이미지를 표시할 수 없습니다. 후보 영역만 표시합니다.", 24, 32);
      drawOverlays();
    };
    img.src = page.snapshot_data_url;
  }, [page, selectedSet]);

  if (!page) {
    return (
      <div className="flex h-full items-center justify-center rounded border bg-zinc-50 text-sm text-zinc-500 dark:bg-zinc-900">
        렌더링 스냅샷이 없습니다.
      </div>
    );
  }

  const handleClick = (event: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * canvas.width;
    const y = ((event.clientY - bounds.top) / bounds.height) * canvas.height;
    const hit = [...page.elements]
      .reverse()
      .find(
        (el) =>
          x >= el.rect.x &&
          x <= el.rect.x + el.rect.width &&
          y >= el.rect.y &&
          y <= el.rect.y + el.rect.height,
      );
    if (hit) onElementClick(hit);
  };

  return (
    <div className="flex h-full items-start justify-center overflow-auto rounded border bg-zinc-50 p-2 dark:bg-zinc-900">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="block h-auto max-h-full max-w-full cursor-crosshair"
        data-testid="snapshot-canvas"
      />
    </div>
  );
}
