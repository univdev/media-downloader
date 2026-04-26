import { invoke } from "@/shared/lib/tauri";

export async function prettifyHtml(html: string): Promise<string> {
  return invoke<string>("prettify_html", { html });
}
