import { invoke } from "@/shared/lib/tauri";

export async function createSequence(json: string): Promise<string> {
  return invoke<string>("create_sequence", { json });
}
