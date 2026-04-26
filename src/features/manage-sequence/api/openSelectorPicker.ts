import { invoke } from "@/shared/lib/tauri";

export async function openSelectorPicker(
  targetField: string,
  parentLabel: string,
): Promise<void> {
  return invoke<void>("open_selector_picker", { targetField, parentLabel });
}
