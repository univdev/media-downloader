import { invoke } from "@/shared/lib/tauri";

export async function deleteSequence(name: string): Promise<void> {
  return invoke<void>("delete_sequence", { name });
}
