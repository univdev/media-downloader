import { Button } from "@/shared/ui/button";
import { MatchPreview } from "@/features/match-sequence";

interface MediaToolbarProps {
  url: string;
  matchedName: string | null;
  tiedCandidates: string[];
  isMatching: boolean;
  isStarting: boolean;
  canStart: boolean;
  onUrlChange: (value: string) => void;
  onStartDownload: () => void;
  onOpenSettings: () => void;
}

export function MediaToolbar({
  url,
  matchedName,
  tiedCandidates,
  isMatching,
  isStarting,
  canStart,
  onUrlChange,
  onStartDownload,
  onOpenSettings,
}: MediaToolbarProps) {
  return (
    <div className="flex items-center gap-2 border-b p-3">
      <div className="flex flex-1 flex-col gap-1">
        <input
          type="text"
          className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground"
          placeholder="URL을 입력하세요..."
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
        />
        <MatchPreview
          matchedName={matchedName}
          tiedCandidates={tiedCandidates}
          isMatching={isMatching}
        />
      </div>

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
        disabled={!canStart || isStarting}
        onClick={onStartDownload}
        aria-label="다운로드 시작"
      >
        {isStarting ? "..." : "▶"}
      </Button>
    </div>
  );
}
