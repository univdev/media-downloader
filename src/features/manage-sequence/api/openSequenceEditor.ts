import { invoke } from "@/shared/lib/tauri";

interface OpenSequenceEditorOptions {
  sequenceName?: string;
  urlSeed?: string;
}

export async function openSequenceEditor(
  opts?: OpenSequenceEditorOptions,
): Promise<void> {
  return invoke<void>("open_sequence_editor", {
    sequenceName: opts?.sequenceName,
    urlSeed: opts?.urlSeed,
  });
}
