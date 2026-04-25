import { useState, useCallback, useRef } from "react";
import { MediaToolbar, useMediaToolbarViewModel } from "@/widgets/media-toolbar";
import { DownloadProgress, useDownloadProgressViewModel } from "@/widgets/download-progress";
import { MediaList, MediaItem, useMediaListViewModel, useMediaItemViewModel } from "@/widgets/media-list";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { SequenceDialogContent } from "@/features/manage-sequence/ui/SequenceDialog";
import { useSequenceDialogViewModel } from "@/features/manage-sequence/ui/SequenceDialog.viewmodel";
import { SequenceListDialogContent } from "@/features/manage-sequence/ui/SequenceListDialog";
import { useSequenceListDialogViewModel } from "@/features/manage-sequence/ui/SequenceListDialog.viewmodel";
import { getSequence } from "@/entities/sequence";
import type { Download } from "@/entities/download";
import type { Sequence } from "@/entities/sequence";

function MediaItemConnected({ download }: { download: Download }) {
  const vm = useMediaItemViewModel(download);
  return <MediaItem {...vm} onClick={vm.handleClick} />;
}

type DialogMode = "closed" | "list" | "create" | "edit";

export function HomePage() {
  const toolbar = useMediaToolbarViewModel();
  const progress = useDownloadProgressViewModel();
  const list = useMediaListViewModel();

  const [dialogMode, setDialogMode] = useState<DialogMode>("closed");
  const [editSequence, setEditSequence] = useState<Sequence | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenSettings = useCallback(() => {
    setDialogMode("list");
  }, []);

  const handleCreate = useCallback(() => {
    setEditSequence(undefined);
    setDialogMode("create");
  }, []);

  const handleEdit = useCallback(async (name: string) => {
    try {
      const json = await getSequence(name);
      const seq = JSON.parse(json) as Sequence;
      setEditSequence(seq);
      setDialogMode("edit");
    } catch (e) {
      console.error("Failed to load sequence:", e);
    }
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogMode("closed");
    setEditSequence(undefined);
  }, []);

  const handleBackToList = useCallback(() => {
    setDialogMode("list");
    setEditSequence(undefined);
  }, []);

  const sequenceList = useSequenceListDialogViewModel();
  const sequenceForm = useSequenceDialogViewModel(editSequence, handleBackToList);

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

  const isDialogOpen = dialogMode !== "closed";

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
        onOpenSettings={handleOpenSettings}
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

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "list" && "시퀀스 관리"}
              {dialogMode === "create" && "새 시퀀스"}
              {dialogMode === "edit" && "시퀀스 편집"}
            </DialogTitle>
          </DialogHeader>

          {dialogMode === "list" && (
            <>
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
            </>
          )}

          {(dialogMode === "create" || dialogMode === "edit") && (
            <SequenceDialogContent
              form={sequenceForm.form}
              onSubmit={sequenceForm.handleSubmit}
              onCancel={handleBackToList}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
