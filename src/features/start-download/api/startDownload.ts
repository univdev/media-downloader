import { invoke } from "@/shared/lib/tauri";

export async function startDownload(sequenceJson: string): Promise<number> {
  return invoke<number>("start_download", { sequence_json: sequenceJson });
}
