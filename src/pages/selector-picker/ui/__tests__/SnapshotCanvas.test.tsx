import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SnapshotCanvas } from "../SnapshotCanvas";
import type { RenderedPagePayload } from "@/features/manage-sequence";

const page: RenderedPagePayload = {
  render_id: "1",
  html: "<html><body><img src=\"/a.jpg\"></body></html>",
  snapshot_data_url: null,
  viewport_width: 100,
  viewport_height: 100,
  elements: [
    {
      selector: "body > img",
      tag_name: "img",
      source_url: "https://example.test/a.jpg",
      rect: { x: 10, y: 10, width: 30, height: 30 },
    },
  ],
};

describe("SnapshotCanvas", () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      set fillStyle(_value: string) {},
      set strokeStyle(_value: string) {},
      set lineWidth(_value: number) {},
      set font(_value: string) {},
    })) as unknown as HTMLCanvasElement["getContext"];
  });

  it("clicking a media rect selects the rendered element", () => {
    const onElementClick = vi.fn();
    render(
      <SnapshotCanvas
        page={page}
        selectedSelectors={[]}
        onElementClick={onElementClick}
      />,
    );

    const canvas = screen.getByTestId("snapshot-canvas") as HTMLCanvasElement;
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.click(canvas, { clientX: 20, clientY: 20 });

    expect(onElementClick).toHaveBeenCalledWith(page.elements[0]);
  });
});
