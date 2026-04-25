import { useState, useCallback } from "react";
import { importSequence } from "../api/importSequence";
import { exportSequence } from "../api/exportSequence";

export function useSequenceImportExport() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importFromJson = useCallback(async (json: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const fileName = await importSequence(json);
      return fileName;
    } catch (e) {
      setError(String(e));
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const exportToJson = useCallback(async (name: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const json = await exportSequence(name);
      return json;
    } catch (e) {
      setError(String(e));
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return { importFromJson, exportToJson, isProcessing, error };
}
