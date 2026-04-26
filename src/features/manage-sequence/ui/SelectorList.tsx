import { openSelectorPicker } from "../api/openSelectorPicker";

interface SelectorListProps {
  label: string;
  value: string;
  targetField: "media" | "folder_name";
  parentLabel: string;
  onChange: (value: string) => void;
  error?: string;
}

function splitSelectors(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function joinSelectors(selectors: string[]): string {
  return selectors.join(", ");
}

export function SelectorList({
  label,
  value,
  targetField,
  parentLabel,
  onChange,
  error,
}: SelectorListProps) {
  const selectors = splitSelectors(value);

  const handleRegister = async () => {
    try {
      await openSelectorPicker(targetField, parentLabel);
    } catch (e) {
      console.error("Failed to open selector picker:", e);
    }
  };

  const handleRemove = (idx: number) => {
    const updated = selectors.filter((_, i) => i !== idx);
    onChange(joinSelectors(updated));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        {label ? (
          <label className="text-sm font-medium">{label}</label>
        ) : (
          <span />
        )}
        <button
          type="button"
          className="rounded-md bg-primary px-2 py-0.5 text-xs text-primary-foreground hover:bg-primary/90"
          onClick={handleRegister}
        >
          등록
        </button>
      </div>

      {selectors.length === 0 ? (
        <p className="rounded-md border border-dashed border-input bg-background px-3 py-2 text-xs text-muted-foreground">
          등록된 요소 없음
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {selectors.map((selector, idx) => (
            <li
              key={`${selector}-${idx}`}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              <span className="font-mono">{selector}</span>
              <button
                type="button"
                aria-label={`${selector} 제거`}
                className="rounded-sm text-muted-foreground hover:text-destructive"
                onClick={() => handleRemove(idx)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
