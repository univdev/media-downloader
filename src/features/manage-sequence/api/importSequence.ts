import { invoke } from "@/shared/lib/tauri";

export async function importSequence(json: string): Promise<string> {
  const isValid = await invoke<boolean>("validate_sequence", { json });
  if (!isValid) {
    throw new Error("Invalid sequence format");
  }
  return invoke<string>("create_sequence", { json });
}
