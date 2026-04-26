import { SelectorList } from "./SelectorList";

interface NamingPatternInputProps {
  label: string;
  pattern: string;
  source: "literal" | "selector";
  selectorValue: string;
  selectorTargetField: "media" | "folder_name";
  selectorParentLabel: string;
  sourceOptions: { value: string; label: string }[];
  error?: string;
  onPatternChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onSelectorChange: (value: string) => void;
}

export function NamingPatternInput({
  label,
  pattern,
  source,
  selectorValue,
  selectorTargetField,
  selectorParentLabel,
  sourceOptions,
  error,
  onPatternChange,
  onSourceChange,
  onSelectorChange,
}: NamingPatternInputProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <div className="flex gap-1">
          {sourceOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`rounded-md px-2 py-0.5 text-xs transition-colors ${
                source === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              onClick={() => onSourceChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {source === "selector" ? (
        <SelectorList
          label=""
          value={selectorValue}
          targetField={selectorTargetField}
          parentLabel={selectorParentLabel}
          onChange={onSelectorChange}
          error={error}
        />
      ) : (
        <>
          <input
            type="text"
            className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground"
            placeholder="my_gallery"
            value={pattern}
            onChange={(e) => onPatternChange(e.target.value)}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </>
      )}
    </div>
  );
}
