import type { SequenceMeta } from "@/entities/sequence";
import { Button } from "@/shared/ui/button";

interface SequenceListDialogContentProps {
  sequences: SequenceMeta[];
  isProcessing: boolean;
  onEdit: (name: string) => void;
  onDelete: (name: string) => void;
  onExport: (name: string) => void;
  onImport: () => void;
  onCreate: () => void;
}

export function SequenceListDialogContent({
  sequences,
  isProcessing,
  onEdit,
  onDelete,
  onExport,
  onImport,
  onCreate,
}: SequenceListDialogContentProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">저장된 시퀀스</h3>
        <div className="flex gap-1">
          <Button variant="outline" size="xs" onClick={onImport} disabled={isProcessing}>
            Import
          </Button>
          <Button size="xs" onClick={onCreate}>
            새 시퀀스
          </Button>
        </div>
      </div>

      {sequences.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          저장된 시퀀스가 없습니다.
        </p>
      ) : (
        <div className="space-y-1.5">
          {sequences.map((seq) => (
            <div
              key={seq.name}
              className="flex items-center justify-between rounded-md border p-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{seq.name}</p>
                {seq.description && (
                  <p className="truncate text-xs text-muted-foreground">
                    {seq.description}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-xs" onClick={() => onEdit(seq.name)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>
                </Button>
                <Button variant="ghost" size="icon-xs" onClick={() => onExport(seq.name)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </Button>
                <Button variant="destructive" size="icon-xs" onClick={() => onDelete(seq.name)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
