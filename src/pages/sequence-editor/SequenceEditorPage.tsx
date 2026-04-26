import { SequenceDialogContent } from "@/features/manage-sequence/ui/SequenceDialog";
import { useSequenceEditorViewModel } from "./model/useSequenceEditorViewModel";

export function SequenceEditorPage() {
  const vm = useSequenceEditorViewModel();

  if (vm.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        시퀀스 로딩 중...
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background p-4">
      <header className="mb-3 flex items-center justify-between">
        <h1 className="text-base font-semibold">
          {vm.sequenceName ? `시퀀스 편집: ${vm.sequenceName}` : "새 시퀀스"}
        </h1>
        {vm.isSaving && (
          <span className="text-xs text-muted-foreground">저장 중...</span>
        )}
      </header>

      {vm.loadError && (
        <p className="mb-2 rounded-md border border-destructive bg-destructive/10 p-2 text-xs text-destructive">
          {vm.loadError}
        </p>
      )}

      {vm.saveError && (
        <p className="mb-2 rounded-md border border-destructive bg-destructive/10 p-2 text-xs text-destructive">
          {vm.saveError}
        </p>
      )}

      <div className="flex-1 overflow-auto">
        <SequenceDialogContent
          form={vm.form}
          onSubmit={vm.handleSave}
          onCancel={vm.handleCancel}
        />
      </div>
    </div>
  );
}
