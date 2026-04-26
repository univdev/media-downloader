import { invoke } from "@/shared/lib/tauri";
import type { MatchResult } from "../model/types";

export async function findSequenceByUrl(url: string): Promise<MatchResult | null> {
  return invoke<MatchResult | null>("find_sequence_by_url", { url });
}
