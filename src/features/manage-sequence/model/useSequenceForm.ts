import { useState, useCallback } from "react";
import type { Sequence } from "@/entities/sequence";

export interface SequenceFormErrors {
  name?: string;
  url_pattern?: string;
  media_selector?: string;
  folder_pattern?: string;
  file_pattern?: string;
}

const INVALID_NAME_CHARS = /[\\/:*?"<>|]/;

function validateName(name: string): string | undefined {
  if (!name.trim()) return "시퀀스 이름을 입력해주세요";
  if (INVALID_NAME_CHARS.test(name)) {
    return "이름에 다음 문자는 사용할 수 없습니다: \\ / : * ? \" < > |";
  }
  return undefined;
}

const FILE_PATTERN_TOKENS = ["{index}", "{date}", "{datetime}"];

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

function validateFilePattern(pattern: string, source: string): string | undefined {
  if (!pattern.trim()) return "파일명 패턴을 입력해주세요";
  if (source === "pattern") {
    const hasToken = FILE_PATTERN_TOKENS.some((token) => pattern.includes(token));
    if (!hasToken) {
      return "파일명 패턴에 최소 1개의 토큰({index}, {date}, {datetime})을 포함해야 합니다";
    }
  }
  return undefined;
}

export function useSequenceForm(initial?: Sequence) {
  const [urlPattern, setUrlPattern] = useState(initial?.url_pattern ?? "");
  const [mediaUrlPattern, setMediaUrlPattern] = useState(initial?.media_url_pattern ?? "");
  const [mediaSelector, setMediaSelector] = useState(initial?.selectors.media ?? "");
  const [folderNameSelector, setFolderNameSelector] = useState(initial?.selectors.folder_name ?? "");
  const [fileNameSelector, setFileNameSelector] = useState(initial?.selectors.file_name ?? "");
  const [folderPattern, setFolderPattern] = useState(initial?.naming.folder ?? "");
  const [folderSource, setFolderSource] = useState<"literal" | "selector">(
    initial?.naming.folder_source ?? "literal"
  );
  const [filePattern, setFilePattern] = useState(initial?.naming.file ?? "{date}_{index}");
  const [fileSource, setFileSource] = useState<"pattern" | "selector">(
    initial?.naming.file_source ?? "pattern"
  );
  const [name, setName] = useState(initial?.meta.name ?? "");
  const [description, setDescription] = useState(initial?.meta.description ?? "");
  const [errors, setErrors] = useState<SequenceFormErrors>({});

  const validate = useCallback((): boolean => {
    const newErrors: SequenceFormErrors = {
      name: validateName(name),
      url_pattern: validateUrlPattern(urlPattern),
      media_selector: validateMediaSelector(mediaSelector),
      folder_pattern: validateFolderPattern(folderPattern),
      file_pattern: validateFilePattern(filePattern, fileSource),
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  }, [name, urlPattern, mediaSelector, folderPattern, filePattern, fileSource]);

  const toJson = useCallback((): string => {
    const now = new Date().toISOString();
    const sequence: Sequence = {
      version: "1.0",
      meta: {
        name,
        description,
        author: "",
        created_at: initial?.meta.created_at ?? now,
        updated_at: now,
      },
      url_pattern: urlPattern,
      media_url_pattern: mediaUrlPattern.trim() || null,
      selectors: {
        media: mediaSelector,
        folder_name: folderSource === "selector" ? folderNameSelector : null,
        file_name: fileSource === "selector" ? fileNameSelector : null,
      },
      naming: {
        folder: folderPattern,
        folder_source: folderSource,
        file: filePattern,
        file_source: fileSource,
      },
    };
    return JSON.stringify(sequence, null, 2);
  }, [
    name, description, urlPattern, mediaUrlPattern, mediaSelector,
    folderNameSelector, fileNameSelector,
    folderPattern, folderSource, filePattern, fileSource, initial,
  ]);

  const copyEntryToMedia = useCallback(() => {
    setMediaUrlPattern(urlPattern);
  }, [urlPattern]);

  return {
    name, setName,
    description, setDescription,
    urlPattern, setUrlPattern,
    mediaUrlPattern, setMediaUrlPattern,
    copyEntryToMedia,
    mediaSelector, setMediaSelector,
    folderNameSelector, setFolderNameSelector,
    fileNameSelector, setFileNameSelector,
    folderPattern, setFolderPattern,
    folderSource, setFolderSource,
    filePattern, setFilePattern,
    fileSource, setFileSource,
    errors,
    validate,
    toJson,
  };
}
