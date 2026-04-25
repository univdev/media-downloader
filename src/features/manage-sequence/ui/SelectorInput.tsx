interface SelectorInputProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

export function SelectorInput({ value, error, onChange }: SelectorInputProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">CSS 셀렉터</label>
      <input
        type="text"
        className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground"
        placeholder=".gallery img"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        이미지/비디오를 선택할 CSS 셀렉터
      </p>
    </div>
  );
}
