interface UrlPatternInputProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

export function UrlPatternInput({ value, error, onChange }: UrlPatternInputProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">URL 패턴</label>
      <input
        type="text"
        className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground"
        placeholder="https://example.com/gallery/{index:start=1,to=10}"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        {"{index:start=N,to=M}"} 숫자 범위 · {"{[a, b, c]}"} 문자열 배열
      </p>
    </div>
  );
}
