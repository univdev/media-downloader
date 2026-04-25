import { invoke } from "@/shared/lib/tauri";

export async function openFolder(path: string): Promise<void> {
  return invoke<void>("open_folder", { path });
}
