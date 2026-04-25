import type { DownloadProgress as DownloadProgressType } from "@/entities/download";
import { Button } from "@/shared/ui/button";

interface DownloadProgressProps {
  progress: DownloadProgressType;
  percentage: number;
  isCancelling: boolean;
  onCancel: () => void;
}

export function DownloadProgress({
  progress,
  percentage,
  isCancelling,
  onCancel,
}: DownloadProgressProps) {
  const phaseLabel = progress.phase === "scanning" ? "스캔 중..." : "다운로드 중...";
  const hasFailures = progress.failed_count > 0;

  return (
    <div className="border-b px-3 py-2">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{phaseLabel}</span>
        <div className="flex items-center gap-2">
          <span>
            {progress.current}/{progress.total}
          </span>
          {hasFailures && (
            <span className="text-orange-500">
              {progress.failed_count} 실패
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onCancel}
            disabled={isCancelling}
            aria-label="취소"
          >
            ✕
          </Button>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${
            hasFailures ? "bg-orange-500" : "bg-primary"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
