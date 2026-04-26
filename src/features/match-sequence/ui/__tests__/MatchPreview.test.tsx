import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MatchPreview } from "../MatchPreview";

describe("MatchPreview", () => {
  it("matchedName이 있을 때 이름 텍스트가 노출된다", () => {
    render(
      <MatchPreview
        matchedName="my-seq"
        tiedCandidates={[]}
        isMatching={false}
      />,
    );
    expect(screen.getByText("my-seq")).toBeInTheDocument();
    expect(screen.getByText(/매칭됨/)).toBeInTheDocument();
  });

  it("tiedCandidates가 N개면 +N 배지가 노출된다", () => {
    render(
      <MatchPreview
        matchedName="a"
        tiedCandidates={["b", "c"]}
        isMatching={false}
      />,
    );
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("tiedCandidates가 비어있으면 +N 배지가 없다", () => {
    render(
      <MatchPreview
        matchedName="a"
        tiedCandidates={[]}
        isMatching={false}
      />,
    );
    expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
  });

  it("isMatching이면 '매칭 중...' 표시한다", () => {
    render(
      <MatchPreview
        matchedName={null}
        tiedCandidates={[]}
        isMatching={true}
      />,
    );
    expect(screen.getByText("매칭 중...")).toBeInTheDocument();
  });

  it("matchedName이 없고 isMatching도 아니면 placeholder만 노출", () => {
    const { container } = render(
      <MatchPreview
        matchedName={null}
        tiedCandidates={[]}
        isMatching={false}
      />,
    );
    expect(screen.queryByText(/매칭됨/)).not.toBeInTheDocument();
    expect(screen.queryByText("매칭 중...")).not.toBeInTheDocument();
    // placeholder span 존재 (aria-hidden 처리)
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});
