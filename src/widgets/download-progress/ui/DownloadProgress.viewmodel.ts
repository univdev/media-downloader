import { useCallback } from "react";
import { useDownloadStore } from "@/entities/download";
import { useCancelDownload } from "@/features/cancel-download";
import { useTauriEvent } from "@/shared/hooks/useTauriEvent";
import type { DownloadProgress as DownloadProgressType } from "@/entities/download";

export function useDownloadProgressViewModel() {
  const { activeProgress, setActiveProgress } = useDownloadStore();
  const { cancel, isCancelling } = useCancelDownload();

  const handleProgress = useCallback(
    (payload: DownloadProgressType) => {
      setActiveProgress(payload);
      if (payload.status === "completed" || payload.status === "failed") {
        setTimeout(() => setActiveProgress(null), 3000);
      }
    },
    [setActiveProgress]
  );

  useTauriEvent<DownloadProgressType>("download-progress", handleProgress);

  const handleCancel = useCallback(async () => {
    if (activeProgress) {
      await cancel(activeProgress.download_id);
      setActiveProgress(null);
    }
  }, [activeProgress, cancel, setActiveProgress]);

  const percentage =
    activeProgress && activeProgress.total > 0
      ? Math.round((activeProgress.current / activeProgress.total) * 100)
      : 0;

  return {
    activeProgress,
    percentage,
    isCancelling,
    cancelDownload: handleCancel,
  };
}
