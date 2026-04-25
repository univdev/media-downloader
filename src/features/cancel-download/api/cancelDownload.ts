import { invoke } from "@/shared/lib/tauri";

export async function cancelDownload(downloadId: number): Promise<void> {
  return invoke<void>("cancel_download", { download_id: downloadId });
}
