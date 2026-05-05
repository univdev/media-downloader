import { invoke } from "@/shared/lib/tauri";

export interface RenderedElementRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RenderedElement {
  selector: string;
  tag_name: string;
  source_url: string | null;
  rect: RenderedElementRect;
}

export interface RenderedPagePayload {
  render_id: string;
  html: string;
  snapshot_data_url: string | null;
  viewport_width: number;
  viewport_height: number;
  elements: RenderedElement[];
}

export async function fetchRenderedPage(url: string): Promise<RenderedPagePayload> {
  return invoke<RenderedPagePayload>("fetch_rendered_page", { url });
}
