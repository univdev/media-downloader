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
        {form.errors.name && (
          <p className="text-xs text-destructive">{form.errors.name}</p>
        )}
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

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">미디어 URL 패턴</label>
          <button
            type="button"
            className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted/80"
            onClick={form.copyEntryToMedia}
          >
            엔트리 URL과 동일
          </button>
        </div>
        <input
          type="text"
          className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground"
          placeholder="비워두면 엔트리 URL에서 직접 미디어 추출"
          value={form.mediaUrlPattern}
          onChange={(e) => form.setMediaUrlPattern(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          엔트리 URL과 다운로드 URL이 다를 경우 설정. {"{id}"}, {"{page}"} 등 캡처 변수 사용 가능.
        </p>
      </div>

      {form.mediaUrlPattern && (
        <PatternPreview urlPattern={form.mediaUrlPattern} />
      )}

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
