import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelectorList } from "../SelectorList";

vi.mock("../../api/openSelectorPicker", () => ({
  openSelectorPicker: vi.fn(() => Promise.resolve()),
}));

import { openSelectorPicker } from "../../api/openSelectorPicker";

describe("SelectorList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("빈 value면 placeholder를 보여준다", () => {
    render(
      <SelectorList
        label="다운받을 미디어 요소"
        value=""
        targetField="media"
        parentLabel="sequence-editor"
        onChange={() => {}}
      />,
    );

    expect(screen.getByText("등록된 요소 없음")).toBeInTheDocument();
    expect(screen.getByText("다운받을 미디어 요소")).toBeInTheDocument();
  });

  it("value 1개를 chip으로 렌더한다", () => {
    render(
      <SelectorList
        label="다운받을 미디어 요소"
        value=".gallery img"
        targetField="media"
        parentLabel="sequence-editor"
        onChange={() => {}}
      />,
    );

    expect(screen.getByText(".gallery img")).toBeInTheDocument();
    expect(screen.queryByText("등록된 요소 없음")).not.toBeInTheDocument();
  });

  it("value N개를 콤마로 split해서 chip으로 렌더한다", () => {
    render(
      <SelectorList
        label="다운받을 미디어 요소"
        value=".a img, .b img, .c img"
        targetField="media"
        parentLabel="sequence-editor"
        onChange={() => {}}
      />,
    );

    expect(screen.getByText(".a img")).toBeInTheDocument();
    expect(screen.getByText(".b img")).toBeInTheDocument();
    expect(screen.getByText(".c img")).toBeInTheDocument();
  });

  it("X 버튼 클릭 시 해당 항목을 제거한 value를 onChange로 전달한다", async () => {
    const onChange = vi.fn();
    render(
      <SelectorList
        label="다운받을 미디어 요소"
        value=".a img, .b img, .c img"
        targetField="media"
        parentLabel="sequence-editor"
        onChange={onChange}
      />,
    );

    const removeBtn = screen.getByLabelText(".b img 제거");
    await userEvent.click(removeBtn);

    expect(onChange).toHaveBeenCalledWith(".a img, .c img");
  });

  it("등록 버튼 클릭 시 openSelectorPicker가 target/parent와 함께 호출된다", async () => {
    render(
      <SelectorList
        label="폴더명"
        value=""
        targetField="folder_name"
        parentLabel="sequence-editor"
        onChange={() => {}}
      />,
    );

    await userEvent.click(screen.getByText("등록"));
    expect(openSelectorPicker).toHaveBeenCalledWith("folder_name", "sequence-editor");
  });

  it("error 메시지가 있으면 표시한다", () => {
    render(
      <SelectorList
        label="다운받을 미디어 요소"
        value=""
        targetField="media"
        parentLabel="sequence-editor"
        onChange={() => {}}
        error="셀렉터를 등록해주세요"
      />,
    );

    expect(screen.getByText("셀렉터를 등록해주세요")).toBeInTheDocument();
  });
});
