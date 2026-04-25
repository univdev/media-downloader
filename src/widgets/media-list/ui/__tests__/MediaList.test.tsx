import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { MediaList } from "../MediaList";
import type { Download } from "@/entities/download";

const createMockDownload = (id: number): Download => ({
  id,
  sequence_name: `Seq ${id}`,
  status: "completed",
  total_files: 10,
  completed_files: 10,
  failed_files: 0,
  save_directory: `/downloads/example.com/folder_${id}`,
  started_at: "2026-04-26T00:00:00Z",
  finished_at: "2026-04-26T00:01:00Z",
  created_at: "2026-04-26T00:00:00Z",
});

describe("MediaList", () => {
  it("다운로드 항목이 없으면 빈 상태 메시지를 표시한다", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <MediaList
        downloads={[]}
        isLoading={false}
        hasMore={false}
        containerRef={ref}
        renderItem={() => null}
      />
    );

    expect(screen.getByText("다운로드 기록이 없습니다.")).toBeInTheDocument();
  });

  it("다운로드 항목이 있으면 renderItem으로 렌더링한다", () => {
    const ref = createRef<HTMLDivElement>();
    const downloads = [createMockDownload(1), createMockDownload(2)];

    render(
      <MediaList
        downloads={downloads}
        isLoading={false}
        hasMore={true}
        containerRef={ref}
        renderItem={(d) => <span>Item {d.id}</span>}
      />
    );

    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();
  });

  it("로딩 중이면 로딩 텍스트를 표시한다", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <MediaList
        downloads={[]}
        isLoading={true}
        hasMore={true}
        containerRef={ref}
        renderItem={() => null}
      />
    );

    expect(screen.getByText("로딩 중...")).toBeInTheDocument();
  });
});
