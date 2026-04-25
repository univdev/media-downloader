import { useCallback } from "react";
import { useSequenceStore } from "@/entities/sequence";
import { deleteSequence } from "../api/deleteSequence";
import { useSequenceImportExport } from "../model/useSequenceImportExport";

export function useSequenceListDialogViewModel() {
  const { sequences, fetch: refreshSequences } = useSequenceStore();
  const { importFromJson, exportToJson, isProcessing } = useSequenceImportExport();

  const handleDelete = useCallback(
    async (name: string) => {
      try {
        await deleteSequence(name);
        await refreshSequences();
      } catch (e) {
        console.error("Failed to delete sequence:", e);
      }
    },
    [refreshSequences]
  );

  const handleExport = useCallback(
    async (name: string) => {
      const json = await exportToJson(name);
      if (json) {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${name.replace(/\s+/g, "-").toLowerCase()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    },
    [exportToJson]
  );

  const handleImport = useCallback(
    async (fileContent: string) => {
      const result = await importFromJson(fileContent);
      if (result) {
        await refreshSequences();
      }
      return result;
    },
    [importFromJson, refreshSequences]
  );

  return {
    sequences,
    isProcessing,
    deleteSequence: handleDelete,
    exportSequence: handleExport,
    importSequence: handleImport,
    refreshSequences,
  };
}
