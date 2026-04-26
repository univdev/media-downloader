import { useEffect, useState } from "react";
import { getHashParams } from "@/shared/router";
import { getSequence, type Sequence } from "@/entities/sequence";

interface UseSequenceFormFromHashResult {
  initial: Sequence | undefined;
  isLoading: boolean;
  loadError: string | null;
  sequenceName: string | null;
}

function buildSeedSequence(urlSeed: string): Sequence {
  const now = new Date().toISOString();
  return {
    version: "1.0",
    meta: {
      name: "",
      description: "",
      author: "",
      created_at: now,
      updated_at: now,
    },
    url_pattern: urlSeed,
    media_url_pattern: null,
    selectors: {
      media: "",
      folder_name: null,
    },
    naming: {
      folder: "",
      folder_source: "literal",
    },
  };
}

export function useSequenceFormFromHash(): UseSequenceFormFromHashResult {
  const [initial, setInitial] = useState<Sequence | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sequenceName, setSequenceName] = useState<string | null>(null);

  useEffect(() => {
    const params = getHashParams();
    const name = params.get("name");
    const urlSeed = params.get("urlSeed");
    setSequenceName(name);

    if (!name) {
      // 새 시퀀스: urlSeed가 있으면 url_pattern prefill.
      if (urlSeed && urlSeed.length > 0) {
        setInitial(buildSeedSequence(urlSeed));
      } else {
        setInitial(undefined);
      }
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    getSequence(name)
      .then((json) => {
        if (cancelled) return;
        try {
          const seq = JSON.parse(json) as Sequence;
          setInitial(seq);
        } catch (e) {
          setLoadError(`시퀀스 파싱 실패: ${String(e)}`);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(`시퀀스 로드 실패: ${String(e)}`);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { initial, isLoading, loadError, sequenceName };
}
