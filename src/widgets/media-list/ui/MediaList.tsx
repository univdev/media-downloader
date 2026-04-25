import type { RefObject } from "react";
import type { Download } from "@/entities/download";

interface MediaListProps {
  downloads: Download[];
  isLoading: boolean;
  hasMore: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  renderItem: (download: Download) => React.ReactNode;
}

export function MediaList({
  downloads,
  isLoading,
  containerRef,
  renderItem,
}: MediaListProps) {
  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-3">
      {downloads.length === 0 && !isLoading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          다운로드 기록이 없습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {downloads.map((download) => (
            <div key={download.id}>{renderItem(download)}</div>
          ))}
        </div>
      )}
      {isLoading && (
        <p className="py-4 text-center text-xs text-muted-foreground">
          로딩 중...
        </p>
      )}
    </div>
  );
}
