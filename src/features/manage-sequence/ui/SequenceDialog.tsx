import { UrlPatternEditor } from "./UrlPatternEditor";
import { SelectorList } from "./SelectorList";
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">입력 URL 패턴</label>
          <button
            type="button"
            className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted/80"
            onClick={form.addMatchPattern}
          >
            패턴 추가
          </button>
        </div>
        <div className="space-y-2">
          {form.matchPatterns.map((pattern, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <UrlPatternEditor
                    value={pattern}
                    error={index === 0 ? form.errors.url_pattern : undefined}
                    onChange={(value) => form.setMatchPatternAt(index, value)}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => form.removeMatchPattern(index)}
                  disabled={form.matchPatterns.length <= 1}
                >
                  삭제
                </Button>
              </div>
              {pattern && <PatternPreview urlPattern={pattern} />}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">탐색 URL 패턴</label>
          <button
            type="button"
            className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted/80"
            onClick={form.copyEntryToMedia}
          >
            첫 입력 패턴과 동일
          </button>
        </div>
        <input
          type="text"
          className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground"
          placeholder="실제로 순차 탐색할 URL 패턴"
          value={form.crawlUrlPattern}
          onChange={(e) => form.setCrawlUrlPattern(e.target.value)}
        />
        {form.errors.crawl_url_pattern && (
          <p className="text-xs text-destructive">{form.errors.crawl_url_pattern}</p>
        )}
        <p className="text-xs text-muted-foreground">
          입력 URL 패턴에서 추출한 {"{id}"}, {"{index}"} 등을 사용해 실제 방문 URL을 만듭니다.
        </p>
      </div>

      {form.crawlUrlPattern && (
        <PatternPreview urlPattern={form.crawlUrlPattern} />
      )}

      <SelectorList
        label="다운받을 미디어 요소"
        value={form.mediaSelector}
        targetField="media"
        parentLabel="sequence-editor"
        error={form.errors.media_selector}
        onChange={form.setMediaSelector}
      />

      <NamingPatternInput
        label="폴더명"
        pattern={form.folderPattern}
        source={form.folderSource}
        selectorValue={form.folderNameSelector ?? ""}
        selectorTargetField="folder_name"
        selectorParentLabel="sequence-editor"
        sourceOptions={[
          { value: "literal", label: "직접 입력" },
          { value: "selector", label: "셀렉터" },
        ]}
        error={form.errors.folder_pattern}
        onPatternChange={form.setFolderPattern}
        onSourceChange={(v) => form.setFolderSource(v as "literal" | "selector")}
        onSelectorChange={form.setFolderNameSelector}
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
