interface MediaItemProps {
  folderName: string;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  date: string;
  hasFailures: boolean;
  isComplete: boolean;
  onClick: () => void;
}

export function MediaItem({
  folderName,
  totalFiles,
  completedFiles,
  failedFiles,
  date,
  hasFailures,
  onClick,
}: MediaItemProps) {
  return (
    <button
      type="button"
      className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{folderName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {totalFiles} files · {date}
          </p>
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-xs">
        <span className="text-green-600">{completedFiles} 완료</span>
        {hasFailures && (
          <span className="text-orange-500">{failedFiles} 실패</span>
        )}
      </div>
    </button>
  );
}
