import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSequenceForm } from "../useSequenceForm";

describe("useSequenceForm", () => {
  it("초기 상태가 올바르다", () => {
    const { result } = renderHook(() => useSequenceForm());
    expect(result.current.urlPattern).toBe("");
    expect(result.current.mediaSelector).toBe("");
    expect(result.current.filePattern).toBe("{date}_{index}");
    expect(result.current.folderSource).toBe("literal");
    expect(result.current.fileSource).toBe("pattern");
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

  it("파일 패턴에 토큰이 없으면 유효성 검증에 실패한다", () => {
    const { result } = renderHook(() => useSequenceForm());

    act(() => {
      result.current.setUrlPattern("https://example.com");
      result.current.setMediaSelector("img");
      result.current.setFolderPattern("my_folder");
      result.current.setFilePattern("plain_text");
      result.current.setFileSource("pattern");
    });

    let isValid: boolean;
    act(() => {
      isValid = result.current.validate();
    });

    expect(isValid!).toBe(false);
    expect(result.current.errors.file_pattern).toContain("토큰");
  });

  it("파일 소스가 selector이면 토큰 없이도 통과한다", () => {
    const { result } = renderHook(() => useSequenceForm());

    act(() => {
      result.current.setUrlPattern("https://example.com");
      result.current.setMediaSelector("img");
      result.current.setFolderPattern("my_folder");
      result.current.setFilePattern("any_text");
      result.current.setFileSource("selector");
    });

    let isValid: boolean;
    act(() => {
      isValid = result.current.validate();
    });

    expect(isValid!).toBe(true);
  });

  it("모든 필드가 올바르면 유효성 검증에 성공한다", () => {
    const { result } = renderHook(() => useSequenceForm());

    act(() => {
      result.current.setUrlPattern("https://example.com/{index:start=1,to=10}");
      result.current.setMediaSelector(".gallery img");
      result.current.setFolderPattern("my_gallery");
      result.current.setFilePattern("{date}_{index}");
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
      result.current.setFilePattern("{date}_{index}");
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
    expect(parsed.naming.file).toBe("{date}_{index}");
    expect(parsed.naming.file_source).toBe("pattern");
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
      selectors: {
        media: "img.photo",
        folder_name: "h1.title",
        file_name: null,
      },
      naming: {
        folder: "photos",
        folder_source: "selector" as const,
        file: "{index}",
        file_source: "pattern" as const,
      },
    };

    const { result } = renderHook(() => useSequenceForm(initial));

    expect(result.current.name).toBe("Existing");
    expect(result.current.urlPattern).toBe("https://test.com/{index:start=1,to=5}");
    expect(result.current.folderSource).toBe("selector");
    expect(result.current.folderNameSelector).toBe("h1.title");
  });
});
