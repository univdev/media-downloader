interface SelectedListProps {
  selectors: string[];
  onRemove: (idx: number) => void;
}

export function SelectedList(props: SelectedListProps) {
  const { selectors, onRemove } = props;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">선택된 요소 {selectors.length}개</h3>
      {selectors.length === 0 ? (
        <p className="text-xs text-zinc-500">
          왼쪽 HTML에서 라인을 클릭해 셀렉터를 추가하세요.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {selectors.map((sel, idx) => (
            <li
              key={`${idx}-${sel}`}
              className="flex items-center justify-between gap-2 rounded border p-2 bg-white dark:bg-zinc-800"
            >
              <code className="text-xs break-all">{sel}</code>
              <button
                type="button"
                aria-label={`선택 ${idx + 1} 제거`}
                onClick={() => onRemove(idx)}
                className="text-xs text-red-500 hover:text-red-700 shrink-0"
              >
                X
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
