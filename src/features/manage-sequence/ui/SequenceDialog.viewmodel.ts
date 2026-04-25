import { useCallback } from "react";
import { useSequenceForm } from "../model/useSequenceForm";
import { createSequence } from "../api/createSequence";
import { useSequenceStore } from "@/entities/sequence";
import type { Sequence } from "@/entities/sequence";

export function useSequenceDialogViewModel(
  initial?: Sequence,
  onClose?: () => void
) {
  const form = useSequenceForm(initial);
  const { fetch: refreshSequences } = useSequenceStore();

  const handleSubmit = useCallback(async () => {
    if (!form.validate()) return;

    try {
      const json = form.toJson();
      await createSequence(json);
      await refreshSequences();
      onClose?.();
    } catch (e) {
      console.error("Failed to save sequence:", e);
    }
  }, [form, refreshSequences, onClose]);

  return {
    form,
    handleSubmit,
  };
}
