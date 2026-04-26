import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SequenceDialogContent } from "../SequenceDialog";
import { useSequenceForm } from "../../model/useSequenceForm";
import { renderHook } from "@testing-library/react";

vi.mock("../../api/openSelectorPicker", () => ({
  openSelectorPicker: vi.fn(() => Promise.resolve()),
}));

function renderWithForm(overrides?: Partial<ReturnType<typeof useSequenceForm>>) {
  const { result } = renderHook(() => useSequenceForm());
  const form = { ...result.current, ...overrides };
  const onSubmit = vi.fn();
  const onCancel = vi.fn();

  render(
    <SequenceDialogContent form={form} onSubmit={onSubmit} onCancel={onCancel} />
  );

  return { form, onSubmit, onCancel };
}

describe("SequenceDialogContent", () => {
  it("모든 입력 필드가 렌더링된다", () => {
    renderWithForm();

    expect(screen.getByPlaceholderText("My Downloader")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/example\.com/)).toBeInTheDocument();
    expect(screen.getByText("다운받을 미디어 요소")).toBeInTheDocument();
  });

  it("저장 버튼 클릭 시 onSubmit이 호출된다", async () => {
    const { onSubmit } = renderWithForm();

    await userEvent.click(screen.getByText("저장"));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("취소 버튼 클릭 시 onCancel이 호출된다", async () => {
    const { onCancel } = renderWithForm();

    await userEvent.click(screen.getByText("취소"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("파일명 섹션이 더 이상 렌더링되지 않는다", () => {
    renderWithForm();

    expect(screen.queryByText("파일명")).not.toBeInTheDocument();
    expect(screen.queryByText("date")).not.toBeInTheDocument();
    expect(screen.queryByText("datetime")).not.toBeInTheDocument();
    expect(screen.queryByText("index")).not.toBeInTheDocument();
  });

  it("폴더명 소스 토글이 표시된다", () => {
    renderWithForm();

    expect(screen.getByText("직접 입력")).toBeInTheDocument();
    expect(screen.getAllByText("셀렉터").length).toBeGreaterThan(0);
  });
});
