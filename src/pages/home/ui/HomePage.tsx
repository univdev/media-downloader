import { useCallback, useRef, useState } from "react";
import { MediaToolbar, useMediaToolbarViewModel } from "@/widgets/media-toolbar";
import { DownloadProgress, useDownloadProgressViewModel } from "@/widgets/download-progress";
import { MediaList, MediaItem, useMediaListViewModel, useMediaItemViewModel } from "@/widgets/media-list";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { SequenceListDialogContent } from "@/features/manage-sequence/ui/SequenceListDialog";
import { useSequenceListDialogViewModel } from "@/features/manage-sequence/ui/SequenceListDialog.viewmodel";
import { openSequenceEditor } from "@/features/manage-sequence";
import { useSequenceStore } from "@/entities/sequence";
import { useTauriEvent } from "@/shared/hooks/useTauriEvent";
import type { Download } from "@/entities/download";

function MediaItemConnected({ download }: { download: Download }) {
  const vm = useMediaItemViewModel(download);
  return <MediaItem {...vm} onClick={vm.handleClick} />;
}

type DialogMode = "closed" | "list";

export function HomePage() {
  const progress = useDownloadProgressViewModel();
  const list = useMediaListViewModel();
  const { fetch: refreshSequences } = useSequenceStore();

  const [dialogMode, setDialogMode] = useState<DialogMode>("closed");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenSettings = useCallback(() => {
    setDialogMode("list");
  }, []);

  const handleCreate = useCallback(() => {
    void openSequenceEditor();
  }, []);

  const handleEdit = useCallback((name: string) => {
    void openSequenceEditor({ sequenceName: name });
  }, []);

  const handleRequestCreateFromUrl = useCallback((urlSeed: string) => {
    void openSequenceEditor({ urlSeed });
  }, []);

  const toolbar = useMediaToolbarViewModel({
    onRequestCreateSequence: handleRequestCreateFromUrl,
  });

  const handleCloseDialog = useCallback(() => {
    setDialogMode("closed");
  }, []);

  const sequenceList = useSequenceListDialogViewModel();

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const text = await file.text();
      await sequenceList.importSequence(text);
      e.target.value = "";
    },
    [sequenceList]
  );

  // W1 (sequence editor) -> main: 시퀀스 저장 시 store refresh.
  useTauriEvent<{ name?: string }>("sequence-saved", () => {
    void refreshSequences();
  });

  const isDialogOpen = dialogMode !== "closed";

  return (
    <div className="flex h-screen flex-col">
      <MediaToolbar
        url={toolbar.url}
        matchedName={toolbar.matchedName}
        tiedCandidates={toolbar.tiedCandidates}
        isMatching={toolbar.isMatching}
        isStarting={toolbar.isStarting}
        canStart={toolbar.canStart}
        onUrlChange={toolbar.setUrl}
        onStartDownload={toolbar.startDownload}
        onOpenSettings={handleOpenSettings}
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

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>시퀀스 관리</DialogTitle>
          </DialogHeader>

          <SequenceListDialogContent
            sequences={sequenceList.sequences}
            isProcessing={sequenceList.isProcessing}
            onEdit={handleEdit}
            onDelete={sequenceList.deleteSequence}
            onExport={sequenceList.exportSequence}
            onImport={handleImportClick}
            onCreate={handleCreate}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileImport}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
