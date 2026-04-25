import { invoke } from "@/shared/lib/tauri";
import type { Download } from "../model/types";

export interface DownloadPage {
  items: Download[];
  total: number;
  page: number;
  page_size: number;
}

export async function listDownloads(
  page: number,
  pageSize: number
): Promise<DownloadPage> {
  return invoke<DownloadPage>("list_downloads", {
    page,
    page_size: pageSize,
  });
}
