import { invoke } from "@/shared/lib/tauri";
import type { SequenceMeta } from "../model/types";

export async function listSequences(): Promise<SequenceMeta[]> {
  return invoke<SequenceMeta[]>("list_sequences");
}
