import { useSelectorPickerViewModel } from "../model/useSelectorPickerViewModel";
import { HtmlSourceView } from "./HtmlSourceView";
import { SelectedList } from "./SelectedList";
import { SnapshotCanvas } from "./SnapshotCanvas";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

export function SelectorPickerPage() {
  const vm = useSelectorPickerViewModel();

  return (
    <div className="flex flex-col h-screen p-4 gap-4 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">셀렉터 선택</h1>
          <p className="text-xs text-zinc-500">
            대상 필드: <code>{vm.target || "(없음)"}</code>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={vm.handleCancel}
            className="px-3 py-1 rounded border text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            취소
          </button>
          <button
            type="button"
            disabled={vm.step !== "ready" || vm.selected.length === 0}
            onClick={vm.handleConfirm}
            className="px-3 py-1 rounded bg-blue-600 text-white text-sm disabled:bg-zinc-300 disabled:cursor-not-allowed"
          >
            확인 ({vm.selected.length})
          </button>
        </div>
      </header>

      {vm.step === "input" && (
        <section className="flex flex-col gap-2 max-w-xl">
          <label htmlFor="picker-url" className="text-sm font-medium">
            예시 URL
          </label>
          <input
            id="picker-url"
            type="url"
            value={vm.url}
            onChange={(e) => vm.setUrl(e.target.value)}
            placeholder="https://example.com/gallery/123"
            className="border rounded px-2 py-1 text-sm bg-white dark:bg-zinc-800"
          />
          {vm.error && <p className="text-xs text-red-500">{vm.error}</p>}
          <button
            type="button"
            onClick={vm.handleConfirmUrl}
            className="self-start px-3 py-1 rounded bg-blue-600 text-white text-sm"
          >
            확인
          </button>
        </section>
      )}

      {vm.step === "loading" && (
        <section className="flex items-center justify-center flex-1">
          <p className="text-sm text-zinc-500">HTML을 불러오는 중...</p>
        </section>
      )}

      {vm.step === "error" && (
        <section className="flex flex-col items-center justify-center flex-1 gap-2">
          <p className="text-sm text-red-500">{vm.error}</p>
          <button
            type="button"
            onClick={vm.handleRetry}
            className="px-3 py-1 rounded border text-sm"
          >
            다시 시도
          </button>
        </section>
      )}

      {vm.step === "ready" && (
        <section className="flex-1 grid grid-cols-[1fr_320px] gap-4 min-h-0">
          <div className="flex flex-col gap-2 min-h-0">
            <Tabs value={vm.activeTab} onValueChange={(value) => vm.setActiveTab(value as typeof vm.activeTab)} className="min-h-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <TabsList>
                  <TabsTrigger value="html">HTML</TabsTrigger>
                  <TabsTrigger value="snapshot" disabled={!vm.renderedPage}>
                    스냅샷
                  </TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-zinc-500">
                    {vm.lineCount} 라인 {vm.isPretty && "· 정리됨"}
                  </p>
                  <button
                    type="button"
                    disabled={vm.isPrettifying}
                    onClick={vm.handleTogglePretty}
                    className="text-xs underline disabled:opacity-50"
                  >
                    {vm.isPretty ? "원본 보기" : "정리하기"}
                  </button>
                </div>
              </div>

              {vm.renderError && (
                <p className="text-xs text-amber-600 dark:text-amber-400">{vm.renderError}</p>
              )}

              <TabsContent value="html" className="min-h-0">
                {vm.tooLarge ? (
                  <p className="text-sm text-red-500">
                    HTML이 너무 큽니다 ({vm.lineCount} 라인). 5만 라인 이하만 지원합니다.
                  </p>
                ) : (
                  <div className="h-full min-h-0 overflow-auto">
                    <HtmlSourceView
                      html={vm.displayHtml}
                      selectedLines={vm.selectedLineSet}
                      onLineClick={vm.handleLineClick}
                      clickableLines={new Set(vm.lineIndex.keys())}
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="snapshot" className="min-h-0">
                <SnapshotCanvas
                  page={vm.renderedPage}
                  selectedSelectors={vm.selectedSelectors}
                  onElementClick={vm.handleRenderedElementClick}
                />
              </TabsContent>
            </Tabs>
          </div>
          <aside className="border-l pl-4 overflow-auto">
            <SelectedList
              selectors={vm.selectedSelectors}
              onRemove={vm.handleRemoveSelected}
            />
          </aside>
        </section>
      )}
    </div>
  );
}
