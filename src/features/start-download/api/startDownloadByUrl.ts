import { invoke } from "@/shared/lib/tauri";

export async function startDownloadByUrl(url: string): Promise<number> {
  return invoke<number>("start_download_by_url", { url });
}
