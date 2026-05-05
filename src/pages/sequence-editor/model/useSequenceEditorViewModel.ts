import { useCallback, useEffect, useRef, useState } from "react";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useSequenceForm } from "@/features/manage-sequence/model/useSequenceForm";
import { createSequence } from "@/features/manage-sequence/api/createSequence";
import { closeWindow as closeWindowCommand } from "@/features/manage-sequence/api/closeWindow";
import { useTauriEvent } from "@/shared/hooks/useTauriEvent";
import { useSequenceFormFromHash } from "./useSequenceFormFromHash";

interface SelectorPickedPayload {
  target: string;
  value: string;
}

export function useSequenceEditorViewModel() {
  const { initial, isLoading, loadError, sequenceName } = useSequenceFormFromHash();
  const form = useSequenceForm(initial);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const dirtyRef = useRef(false);

  // Mark dirty whenever form fields change after initial load.
  useEffect(() => {
    if (isLoading) return;
    dirtyRef.current = true;
  }, [
    isLoading,
    form.name,
    form.description,
    form.urlPattern,
    form.mediaUrlPattern,
    form.mediaSelector,
    form.folderNameSelector,
    form.folderPattern,
    form.folderSource,
  ]);

  // Reset dirty when initial loads (so first paint is not dirty).
  useEffect(() => {
    dirtyRef.current = false;
  }, [initial]);

  const closeWindow = useCallback(async () => {
    try {
      await getCurrentWindow().close();
    } catch (e) {
      console.error("Failed to close window:", e);
      try {
        await closeWindowCommand("sequence-editor");
      } catch (fallbackError) {
        console.error("Failed to close sequence-editor via command:", fallbackError);
      }
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.validate()) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const json = form.toJson();
      await createSequence(json);
      try {
        await emit("sequence-saved", { name: form.name });
      } catch (e) {
        console.error("Failed to emit sequence-saved:", e);
      }
      dirtyRef.current = false;
      await closeWindow();
    } catch (e) {
      setSaveError(`시퀀스 저장 실패: ${String(e)}`);
    } finally {
      setIsSaving(false);
    }
  }, [form, closeWindow]);

  const handleCancel = useCallback(async () => {
    if (dirtyRef.current) {
      const ok = window.confirm("저장하지 않은 변경사항이 있습니다. 정말 닫으시겠습니까?");
      if (!ok) return;
      dirtyRef.current = false;
    }
    await closeWindow();
  }, [closeWindow]);

  // selector-picker 윈도우에서 선택된 셀렉터를 form에 반영.
  const handleSelectorPicked = useCallback(
    (payload: SelectorPickedPayload) => {
      if (payload.target === "media") {
        form.setMediaSelector(payload.value);
      } else if (payload.target === "folder_name") {
        form.setFolderNameSelector(payload.value);
        // selector 모드를 강제 활성화 (폴더 source가 literal이면 자동 전환).
        form.setFolderSource("selector");
      }
    },
    [form],
  );

  useTauriEvent<SelectorPickedPayload>("selector-picked", handleSelectorPicked);

  // onCloseRequested guard.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const win = getCurrentWindow();
    win
      .onCloseRequested(async (event) => {
        if (!dirtyRef.current) return;
        const ok = window.confirm("저장하지 않은 변경사항이 있습니다. 정말 닫으시겠습니까?");
        if (!ok) {
          event.preventDefault();
        } else {
          dirtyRef.current = false;
        }
      })
      .then((fn) => {
        unlisten = fn;
      })
      .catch((e) => console.error("onCloseRequested register failed:", e));
    return () => {
      unlisten?.();
    };
  }, []);

  return {
    form,
    isLoading,
    loadError,
    isSaving,
    saveError,
    sequenceName,
    handleSave,
    handleCancel,
  };
}
