import { useState, useCallback, useEffect } from "react";
import { toast } from "react-toastify";
import { useMatchSequence } from "@/features/match-sequence";
import { useStartDownload } from "@/features/start-download";
import { useDownloadStore } from "@/entities/download";

interface UseMediaToolbarViewModelOptions {
  onRequestCreateSequence?: (urlSeed: string) => void;
}

export function useMediaToolbarViewModel(opts?: UseMediaToolbarViewModelOptions) {
  const [url, setUrl] = useState("");
  const { data: match, isMatching } = useMatchSequence(url);
  const { start, isStarting } = useStartDownload();
  const { refresh } = useDownloadStore();

  useEffect(() => {
    if (!isMatching && url.trim().length >= 5 && match === null) {
      toast.error(
        ({ closeToast }) => (
          <span>
            매칭되는 시퀀스가 없습니다.
            <button
              type="button"
              onClick={() => {
                opts?.onRequestCreateSequence?.(url);
                closeToast?.();
              }}
              className="underline ml-1"
            >
              시퀀스 만들기
            </button>
          </span>
        ),
        { toastId: `no-match-${url}`, autoClose: 6000 }
      );
    }
  }, [isMatching, match, url, opts]);

  const startDownload = useCallback(async () => {
    if (!match) return;
    const id = await start(url);
    if (id !== null) await refresh();
  }, [match, url, start, refresh]);

  return {
    url,
    setUrl,
    matchedName: match?.sequence_name ?? null,
    tiedCandidates: match?.tied_candidates ?? [],
    isMatching,
    isStarting,
    canStart: !!match && url.trim().length > 0,
    startDownload,
  };
}
