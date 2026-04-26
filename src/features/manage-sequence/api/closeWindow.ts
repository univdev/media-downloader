import { invoke } from "@/shared/lib/tauri";

export async function closeWindow(label: string): Promise<void> {
  return invoke<void>("close_window", { label });
}
