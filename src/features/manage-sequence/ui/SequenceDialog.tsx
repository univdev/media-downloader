import { UrlPatternInput } from "./UrlPatternInput";
import { SelectorInput } from "./SelectorInput";
import { NamingPatternInput } from "./NamingPatternInput";
import { PatternPreview } from "./PatternPreview";
import { Button } from "@/shared/ui/button";
import type { useSequenceForm } from "../model/useSequenceForm";

interface SequenceDialogContentProps {
  form: ReturnType<typeof useSequenceForm>;
  onSubmit: () => void;
  onCancel: () => void;
}

export function SequenceDialogContent({
  form,
  onSubmit,
  onCancel,
}: SequenceDialogContentProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">시퀀스 이름</label>
        <input
          type="text"
          className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground"
          placeholder="My Downloader"
          value={form.name}
          onChange={(e) => form.setName(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">설명</label>
        <input
          type="text"
          className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground"
          placeholder="이 시퀀스에 대한 설명..."
          value={form.description}
          onChange={(e) => form.setDescription(e.target.value)}
        />
      </div>

      <UrlPatternInput
        value={form.urlPattern}
        error={form.errors.url_pattern}
        onChange={form.setUrlPattern}
      />

      <PatternPreview urlPattern={form.urlPattern} />

      <SelectorInput
        value={form.mediaSelector}
        error={form.errors.media_selector}
        onChange={form.setMediaSelector}
      />

      <NamingPatternInput
        label="폴더명"
        pattern={form.folderPattern}
        source={form.folderSource}
        selectorValue={form.folderNameSelector ?? ""}
        sourceOptions={[
          { value: "literal", label: "직접 입력" },
          { value: "selector", label: "셀렉터" },
        ]}
        error={form.errors.folder_pattern}
        onPatternChange={form.setFolderPattern}
        onSourceChange={(v) => form.setFolderSource(v as "literal" | "selector")}
        onSelectorChange={form.setFolderNameSelector}
      />

      <NamingPatternInput
        label="파일명"
        pattern={form.filePattern}
        source={form.fileSource}
        selectorValue={form.fileNameSelector ?? ""}
        sourceOptions={[
          { value: "pattern", label: "패턴" },
          { value: "selector", label: "셀렉터" },
        ]}
        tokens={[
          { value: "{date}", label: "date" },
          { value: "{datetime}", label: "datetime" },
          { value: "{index}", label: "index" },
        ]}
        error={form.errors.file_pattern}
        onPatternChange={form.setFilePattern}
        onSourceChange={(v) => form.setFileSource(v as "pattern" | "selector")}
        onSelectorChange={form.setFileNameSelector}
      />

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          취소
        </Button>
        <Button size="sm" onClick={onSubmit}>
          저장
        </Button>
      </div>
    </div>
  );
}
