import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SequenceListDialogContent } from "../SequenceListDialog";

describe("SequenceListDialogContent", () => {
  const defaultProps = {
    sequences: [
      {
        name: "Test Seq",
        description: "A test sequence",
        author: "me",
        created_at: "2026-04-26",
        updated_at: "2026-04-26",
      },
    ],
    isProcessing: false,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onExport: vi.fn(),
    onImport: vi.fn(),
    onCreate: vi.fn(),
  };

  it("시퀀스 목록이 표시된다", () => {
    render(<SequenceListDialogContent {...defaultProps} />);

    expect(screen.getByText("Test Seq")).toBeInTheDocument();
    expect(screen.getByText("A test sequence")).toBeInTheDocument();
  });

  it("시퀀스가 없으면 빈 상태 메시지가 표시된다", () => {
    render(<SequenceListDialogContent {...defaultProps} sequences={[]} />);

    expect(screen.getByText("저장된 시퀀스가 없습니다.")).toBeInTheDocument();
  });

  it("새 시퀀스 버튼 클릭 시 onCreate가 호출된다", async () => {
    const onCreate = vi.fn();
    render(<SequenceListDialogContent {...defaultProps} onCreate={onCreate} />);

    await userEvent.click(screen.getByText("새 시퀀스"));
    expect(onCreate).toHaveBeenCalledOnce();
  });

  it("Import 버튼이 표시된다", () => {
    render(<SequenceListDialogContent {...defaultProps} />);

    expect(screen.getByText("Import")).toBeInTheDocument();
  });
});
