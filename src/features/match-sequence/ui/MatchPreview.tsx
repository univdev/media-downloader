import { Badge } from "@/shared/ui/badge";

interface MatchPreviewProps {
  matchedName: string | null;
  tiedCandidates: string[];
  isMatching: boolean;
}

export function MatchPreview({ matchedName, tiedCandidates, isMatching }: MatchPreviewProps) {
  if (isMatching) {
    return <span className="text-xs text-muted-foreground">매칭 중...</span>;
  }

  if (matchedName) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>매칭됨:</span>
        <Badge variant="secondary">{matchedName}</Badge>
        {tiedCandidates.length > 0 && (
          <Badge variant="outline">+{tiedCandidates.length}</Badge>
        )}
      </span>
    );
  }

  return <span className="text-xs text-muted-foreground" aria-hidden="true">&nbsp;</span>;
}
