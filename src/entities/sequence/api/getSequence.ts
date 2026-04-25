import { invoke } from "@/shared/lib/tauri";

export async function getSequence(name: string): Promise<string> {
  return invoke<string>("get_sequence", { name });
}
