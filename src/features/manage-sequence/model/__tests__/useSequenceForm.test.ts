import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSequenceForm } from "../useSequenceForm";

describe("useSequenceForm", () => {
  it("초기 상태가 올바르다", () => {
    const { result } = renderHook(() => useSequenceForm());
    expect(result.current.urlPattern).toBe("");
    expect(result.current.mediaSelector).toBe("");
    expect(result.current.folderSource).toBe("literal");
  });

  it("빈 URL 패턴은 유효성 검증에 실패한다", () => {
    const { result } = renderHook(() => useSequenceForm());

    let isValid: boolean;
    act(() => {
      isValid = result.current.validate();
    });

    expect(isValid!).toBe(false);
    expect(result.current.errors.url_pattern).toBe("URL 패턴을 입력해주세요");
  });

  it("빈 이름은 유효성 검증에 실패한다", () => {
    const { result } = renderHook(() => useSequenceForm());

    let isValid: boolean;
    act(() => {
      isValid = result.current.validate();
    });

    expect(isValid!).toBe(false);
    expect(result.current.errors.name).toBe("시퀀스 이름을 입력해주세요");
  });

  it("이름에 잘못된 문자가 있으면 유효성 검증에 실패한다", () => {
    const { result } = renderHook(() => useSequenceForm());

    act(() => {
      result.current.setName("invalid/name");
    });

    let isValid: boolean;
    act(() => {
      isValid = result.current.validate();
    });

    expect(isValid!).toBe(false);
    expect(result.current.errors.name).toContain("사용할 수 없습니다");
  });

  it("http로 시작하지 않는 URL은 유효성 검증에 실패한다", () => {
    const { result } = renderHook(() => useSequenceForm());

    act(() => {
      result.current.setUrlPattern("example.com/page");
      result.current.setMediaSelector("img");
      result.current.setFolderPattern("test");
    });

    let isValid: boolean;
    act(() => {
      isValid = result.current.validate();
    });

    expect(isValid!).toBe(false);
    expect(result.current.errors.url_pattern).toBe(
      "URL은 http:// 또는 https://로 시작해야 합니다"
    );
  });

  it("모든 필드가 올바르면 유효성 검증에 성공한다", () => {
    const { result } = renderHook(() => useSequenceForm());

    act(() => {
      result.current.setName("My Sequence");
      result.current.setUrlPattern("https://example.com/{index:start=1,to=10}");
      result.current.setMediaSelector(".gallery img");
      result.current.setFolderPattern("my_gallery");
    });

    let isValid: boolean;
    act(() => {
      isValid = result.current.validate();
    });

    expect(isValid!).toBe(true);
    expect(result.current.errors).toEqual({});
  });

  it("toJson이 올바른 시퀀스 JSON을 생성한다", () => {
    const { result } = renderHook(() => useSequenceForm());

    act(() => {
      result.current.setName("Test Sequence");
      result.current.setDescription("A test");
      result.current.setUrlPattern("https://example.com/{index:start=0,to=5}");
      result.current.setMediaSelector(".img");
      result.current.setFolderPattern("test_folder");
    });

    let json: string;
    act(() => {
      json = result.current.toJson();
    });

    const parsed = JSON.parse(json!);
    expect(parsed.version).toBe("1.0");
    expect(parsed.meta.name).toBe("Test Sequence");
    expect(parsed.url_pattern).toBe("https://example.com/{index:start=0,to=5}");
    expect(parsed.selectors.media).toBe(".img");
    expect(parsed.naming.folder).toBe("test_folder");
    expect(parsed.naming.folder_source).toBe("literal");
  });

  it("신규 시퀀스 생성 시 file 관련 필드가 결과에 없다", () => {
    const { result } = renderHook(() => useSequenceForm());

    act(() => {
      result.current.setName("No File Fields");
      result.current.setUrlPattern("https://example.com/page");
      result.current.setMediaSelector("img");
      result.current.setFolderPattern("folder");
    });

    let json: string;
    act(() => {
      json = result.current.toJson();
    });

    const parsed = JSON.parse(json!);
    expect(parsed.selectors).not.toHaveProperty("file_name");
    expect(parsed.naming).not.toHaveProperty("file");
    expect(parsed.naming).not.toHaveProperty("file_source");
  });

  it("initial 값이 있으면 해당 값으로 초기화된다", () => {
    const initial = {
      version: "1.0",
      meta: {
        name: "Existing",
        description: "desc",
        author: "me",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      url_pattern: "https://test.com/{index:start=1,to=5}",
      media_url_pattern: null,
      selectors: {
        media: "img.photo",
        folder_name: "h1.title",
      },
      naming: {
        folder: "photos",
        folder_source: "selector" as const,
      },
    };

    const { result } = renderHook(() => useSequenceForm(initial));

    expect(result.current.name).toBe("Existing");
    expect(result.current.urlPattern).toBe("https://test.com/{index:start=1,to=5}");
    expect(result.current.folderSource).toBe("selector");
    expect(result.current.folderNameSelector).toBe("h1.title");
  });
});
