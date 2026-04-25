import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SequenceDialogContent } from "../SequenceDialog";
import { useSequenceForm } from "../../model/useSequenceForm";
import { renderHook } from "@testing-library/react";

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
    expect(screen.getByPlaceholderText(".gallery img")).toBeInTheDocument();
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

  it("파일명 토큰 버튼들이 표시된다", () => {
    renderWithForm();

    expect(screen.getByText("date")).toBeInTheDocument();
    expect(screen.getByText("datetime")).toBeInTheDocument();
    expect(screen.getByText("index")).toBeInTheDocument();
  });

  it("폴더명 소스 토글이 표시된다", () => {
    renderWithForm();

    expect(screen.getByText("직접 입력")).toBeInTheDocument();
    expect(screen.getAllByText("셀렉터").length).toBeGreaterThan(0);
  });
});
