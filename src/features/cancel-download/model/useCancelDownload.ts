import { useState, useCallback } from "react";
import { cancelDownload } from "../api/cancelDownload";

export function useCancelDownload() {
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancel = useCallback(async (downloadId: number) => {
    setIsCancelling(true);
    setError(null);
    try {
      await cancelDownload(downloadId);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsCancelling(false);
    }
  }, []);

  return { cancel, isCancelling, error };
}
