import { useState, useCallback } from "react";
import { useSequenceStore } from "@/entities/sequence";
import { useStartDownload } from "@/features/start-download";
import { getSequence } from "@/entities/sequence";
import { useDownloadStore } from "@/entities/download";

export function useMediaToolbarViewModel() {
  const { sequences, selectedName, fetch: fetchSequences, select } = useSequenceStore();
  const { start, isStarting, error: startError } = useStartDownload();
  const { refresh } = useDownloadStore();
  const [urlPattern, setUrlPattern] = useState("");

  const handleSelectSequence = useCallback(async (name: string | null) => {
    select(name);
    if (name) {
      try {
        const json = await getSequence(name);
        const seq = JSON.parse(json);
        setUrlPattern(seq.url_pattern);
      } catch {
        setUrlPattern("");
      }
    } else {
      setUrlPattern("");
    }
  }, [select]);

  const handleStartDownload = useCallback(async () => {
    if (!selectedName) return;
    try {
      const json = await getSequence(selectedName);
      const seq = JSON.parse(json);
      seq.url_pattern = urlPattern;
      const downloadId = await start(JSON.stringify(seq));
      if (downloadId !== null) {
        await refresh();
      }
    } catch {
      // error handled by useStartDownload
    }
  }, [selectedName, urlPattern, start, refresh]);

  return {
    sequences,
    selectedName,
    urlPattern,
    isStarting,
    startError,
    setUrlPattern,
    fetchSequences,
    selectSequence: handleSelectSequence,
    startDownload: handleStartDownload,
  };
}
