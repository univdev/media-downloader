interface NamingPatternInputProps {
  label: string;
  pattern: string;
  source: string;
  selectorValue: string;
  sourceOptions: { value: string; label: string }[];
  tokens?: { value: string; label: string }[];
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
  sourceOptions,
  tokens,
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
        <input
          type="text"
          className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground"
          placeholder="h1.title"
          value={selectorValue}
          onChange={(e) => onSelectorChange(e.target.value)}
        />
      ) : (
        <input
          type="text"
          className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground"
          placeholder={label === "폴더명" ? "my_gallery" : "{date}_{index}"}
          value={pattern}
          onChange={(e) => onPatternChange(e.target.value)}
        />
      )}

      {tokens && source !== "selector" && (
        <div className="flex gap-1">
          {tokens.map((token) => (
            <button
              key={token.value}
              type="button"
              className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted/80"
              onClick={() => onPatternChange(pattern + token.value)}
            >
              {token.label}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
