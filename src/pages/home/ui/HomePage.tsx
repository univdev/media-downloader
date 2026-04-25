import { useState } from "react";
import { MediaToolbar, useMediaToolbarViewModel } from "@/widgets/media-toolbar";
import { DownloadProgress, useDownloadProgressViewModel } from "@/widgets/download-progress";
import { MediaList, MediaItem, useMediaListViewModel, useMediaItemViewModel } from "@/widgets/media-list";
import type { Download } from "@/entities/download";

function MediaItemConnected({ download }: { download: Download }) {
  const vm = useMediaItemViewModel(download);
  return <MediaItem {...vm} onClick={vm.handleClick} />;
}

export function HomePage() {
  const toolbar = useMediaToolbarViewModel();
  const progress = useDownloadProgressViewModel();
  const list = useMediaListViewModel();
  const [_settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col">
      <MediaToolbar
        sequences={toolbar.sequences}
        selectedName={toolbar.selectedName}
        urlPattern={toolbar.urlPattern}
        isStarting={toolbar.isStarting}
        onUrlPatternChange={toolbar.setUrlPattern}
        onSelectSequence={toolbar.selectSequence}
        onStartDownload={toolbar.startDownload}
        onOpenSettings={() => setSettingsOpen(true)}
        onFetchSequences={toolbar.fetchSequences}
      />

      {progress.activeProgress && (
        <DownloadProgress
          progress={progress.activeProgress}
          percentage={progress.percentage}
          isCancelling={progress.isCancelling}
          onCancel={progress.cancelDownload}
        />
      )}

      <MediaList
        downloads={list.downloads}
        isLoading={list.isLoading}
        hasMore={list.hasMore}
        containerRef={list.containerRef}
        renderItem={(download) => <MediaItemConnected download={download} />}
      />
    </div>
  );
}
