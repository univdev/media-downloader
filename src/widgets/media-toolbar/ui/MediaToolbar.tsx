import { useEffect } from "react";
import type { SequenceMeta } from "@/entities/sequence";
import { Button } from "@/shared/ui/button";

interface MediaToolbarProps {
  sequences: SequenceMeta[];
  selectedName: string | null;
  urlPattern: string;
  isStarting: boolean;
  onUrlPatternChange: (value: string) => void;
  onSelectSequence: (name: string | null) => void;
  onStartDownload: () => void;
  onOpenSettings: () => void;
  onFetchSequences: () => void;
}

export function MediaToolbar({
  sequences,
  selectedName,
  urlPattern,
  isStarting,
  onUrlPatternChange,
  onSelectSequence,
  onStartDownload,
  onOpenSettings,
  onFetchSequences,
}: MediaToolbarProps) {
  useEffect(() => {
    onFetchSequences();
  }, [onFetchSequences]);

  return (
    <div className="flex items-center gap-2 border-b p-3">
      <select
        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        value={selectedName ?? ""}
        onChange={(e) => onSelectSequence(e.target.value || null)}
      >
        <option value="">시퀀스 선택...</option>
        {sequences.map((seq) => (
          <option key={seq.name} value={seq.name}>
            {seq.name}
          </option>
        ))}
      </select>

      <input
        type="text"
        className="h-8 flex-1 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground"
        placeholder="URL 패턴을 입력하세요..."
        value={urlPattern}
        onChange={(e) => onUrlPatternChange(e.target.value)}
      />

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onOpenSettings}
        aria-label="시퀀스 설정"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </Button>

      <Button
        size="sm"
        disabled={isStarting || !urlPattern.trim()}
        onClick={onStartDownload}
        aria-label="다운로드 시작"
      >
        {isStarting ? "..." : "▶"}
      </Button>
    </div>
  );
}
