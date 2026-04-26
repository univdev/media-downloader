export interface MatchResult {
  sequence_name: string;
  url_pattern: string;
  captures: Record<string, string>;
  tied_candidates: string[];
}
