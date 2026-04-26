import { invoke } from "@/shared/lib/tauri";

export async function fetchHtml(url: string): Promise<string> {
  return invoke<string>("fetch_html", { url });
}
