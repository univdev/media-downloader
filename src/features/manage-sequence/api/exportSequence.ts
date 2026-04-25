import { getSequence } from "@/entities/sequence";

export async function exportSequence(name: string): Promise<string> {
  return getSequence(name);
}
