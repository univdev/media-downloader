import { useEffect, useState, useCallback } from "react";
import type { Sequence } from "@/entities/sequence";

export interface SequenceFormErrors {
  name?: string;
  url_pattern?: string;
  match_patterns?: string;
  crawl_url_pattern?: string;
  media_selector?: string;
  folder_pattern?: string;
}

const INVALID_NAME_CHARS = /[\\/:*?"<>|]/;

function validateName(name: string): string | undefined {
  if (!name.trim()) return "시퀀스 이름을 입력해주세요";
  if (INVALID_NAME_CHARS.test(name)) {
    return "이름에 다음 문자는 사용할 수 없습니다: \\ / : * ? \" < > |";
  }
  return undefined;
}

function validateUrlPattern(pattern: string): string | undefined {
  if (!pattern.trim()) return "URL 패턴을 입력해주세요";
  if (!pattern.startsWith("http://") && !pattern.startsWith("https://")) {
    return "URL은 http:// 또는 https://로 시작해야 합니다";
  }
  return undefined;
}

function validateMediaSelector(selector: string): string | undefined {
  if (!selector.trim()) return "CSS 셀렉터를 입력해주세요";
  return undefined;
}

function validateFolderPattern(pattern: string): string | undefined {
  if (!pattern.trim()) return "폴더명 패턴을 입력해주세요";
  return undefined;
}

export function useSequenceForm(initial?: Sequence) {
  const initialMatchPatterns =
    initial?.match_patterns && initial.match_patterns.length > 0
      ? initial.match_patterns
      : [initial?.url_pattern ?? ""];
  const [matchPatterns, setMatchPatterns] = useState<string[]>(initialMatchPatterns);
  const [crawlUrlPattern, setCrawlUrlPattern] = useState(
    initial?.crawl_url_pattern ?? initial?.media_url_pattern ?? initial?.url_pattern ?? ""
  );
  const [mediaUrlPattern, setMediaUrlPattern] = useState(initial?.media_url_pattern ?? "");
  const [mediaSelector, setMediaSelector] = useState(initial?.selectors.media ?? "");
  const [folderNameSelector, setFolderNameSelector] = useState(initial?.selectors.folder_name ?? "");
  const [folderPattern, setFolderPattern] = useState(initial?.naming.folder ?? "");
  const [folderSource, setFolderSource] = useState<"literal" | "selector">(
    initial?.naming.folder_source ?? "literal"
  );
  const [name, setName] = useState(initial?.meta.name ?? "");
  const [description, setDescription] = useState(initial?.meta.description ?? "");
  const [errors, setErrors] = useState<SequenceFormErrors>({});
  const urlPattern = matchPatterns[0] ?? "";

  useEffect(() => {
    if (!initial) return;
    const nextMatchPatterns =
      initial.match_patterns && initial.match_patterns.length > 0
        ? initial.match_patterns
        : [initial.url_pattern ?? ""];
    setMatchPatterns(nextMatchPatterns);
    setCrawlUrlPattern(
      initial.crawl_url_pattern ?? initial.media_url_pattern ?? initial.url_pattern ?? "",
    );
    setMediaUrlPattern(initial.media_url_pattern ?? "");
    setMediaSelector(initial.selectors.media ?? "");
    setFolderNameSelector(initial.selectors.folder_name ?? "");
    setFolderPattern(initial.naming.folder ?? "");
    setFolderSource(initial.naming.folder_source ?? "literal");
    setName(initial.meta.name ?? "");
    setDescription(initial.meta.description ?? "");
    setErrors({});
  }, [initial]);

  const setUrlPattern = useCallback((value: string) => {
    setMatchPatterns((prev) => {
      const next = prev.length > 0 ? [...prev] : [""];
      next[0] = value;
      return next;
    });
  }, []);

  const setMatchPatternAt = useCallback((index: number, value: string) => {
    setMatchPatterns((prev) => prev.map((p, i) => (i === index ? value : p)));
  }, []);

  const addMatchPattern = useCallback(() => {
    setMatchPatterns((prev) => [...prev, ""]);
  }, []);

  const removeMatchPattern = useCallback((index: number) => {
    setMatchPatterns((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const validate = useCallback((): boolean => {
    const normalizedPatterns = matchPatterns.map((p) => p.trim()).filter(Boolean);
    const invalidPattern = normalizedPatterns.find(validateUrlPattern);
    const effectiveCrawlPattern = crawlUrlPattern.trim() || normalizedPatterns[0] || "";
    const newErrors: SequenceFormErrors = {
      name: validateName(name),
      url_pattern: normalizedPatterns.length === 0
        ? "URL 패턴을 입력해주세요"
        : invalidPattern
          ? validateUrlPattern(invalidPattern)
          : undefined,
      crawl_url_pattern: validateUrlPattern(effectiveCrawlPattern),
      media_selector: validateMediaSelector(mediaSelector),
      folder_pattern: validateFolderPattern(folderPattern),
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  }, [name, matchPatterns, crawlUrlPattern, mediaSelector, folderPattern]);

  const toJson = useCallback((): string => {
    const now = new Date().toISOString();
    const normalizedMatchPatterns = matchPatterns.map((p) => p.trim()).filter(Boolean);
    const primaryPattern = normalizedMatchPatterns[0] ?? "";
    const normalizedCrawlPattern = crawlUrlPattern.trim() || primaryPattern;
    const sequence: Sequence = {
      version: "1.0",
      meta: {
        name,
        description,
        author: "",
        created_at: initial?.meta.created_at ?? now,
        updated_at: now,
      },
      url_pattern: primaryPattern,
      match_patterns: normalizedMatchPatterns,
      crawl_url_pattern: normalizedCrawlPattern,
      media_url_pattern: null,
      selectors: {
        media: mediaSelector,
        folder_name: folderSource === "selector" ? folderNameSelector : null,
      },
      naming: {
        folder: folderPattern,
        folder_source: folderSource,
      },
    };
    return JSON.stringify(sequence, null, 2);
  }, [
    name, description, matchPatterns, crawlUrlPattern, mediaSelector,
    folderNameSelector,
    folderPattern, folderSource, initial,
  ]);

  const copyEntryToMedia = useCallback(() => {
    setCrawlUrlPattern(urlPattern);
  }, [urlPattern]);

  return {
    name, setName,
    description, setDescription,
    urlPattern, setUrlPattern,
    matchPatterns,
    setMatchPatternAt,
    addMatchPattern,
    removeMatchPattern,
    crawlUrlPattern,
    setCrawlUrlPattern,
    mediaUrlPattern, setMediaUrlPattern,
    copyEntryToMedia,
    mediaSelector, setMediaSelector,
    folderNameSelector, setFolderNameSelector,
    folderPattern, setFolderPattern,
    folderSource, setFolderSource,
    errors,
    validate,
    toJson,
  };
}
