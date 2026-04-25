interface PatternPreviewProps {
  urlPattern: string;
}

function generatePreviewUrls(pattern: string, max: number = 3): string[] {
  if (!pattern.trim()) return [];

  try {
    let result = [pattern];

    const indexRegex = /\{index:start=(\d+)(?:,to=(\d+))?\}/g;
    let match;
    while ((match = indexRegex.exec(pattern)) !== null) {
      const start = parseInt(match[1]);
      const to = match[2] ? parseInt(match[2]) : start + 2;
      const newResult: string[] = [];
      for (let i = start; i <= Math.min(to, start + max - 1); i++) {
        for (const r of result) {
          newResult.push(r.replace(match[0], String(i)));
        }
      }
      result = newResult;
    }

    const arrayRegex = /\{\[([^\]]+)\]\}/g;
    while ((match = arrayRegex.exec(pattern)) !== null) {
      const items = match[1].split(",").map((s) => s.trim());
      const newResult: string[] = [];
      for (const item of items.slice(0, max)) {
        for (const r of result) {
          newResult.push(r.replace(match[0], item));
        }
      }
      result = newResult;
    }

    return result.slice(0, max);
  } catch {
    return [];
  }
}

export function PatternPreview({ urlPattern }: PatternPreviewProps) {
  const urls = generatePreviewUrls(urlPattern);

  if (urls.length === 0) return null;

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">미리보기:</p>
      <div className="space-y-0.5">
        {urls.map((url, i) => (
          <p key={i} className="truncate text-xs text-muted-foreground">
            {url}
          </p>
        ))}
      </div>
    </div>
  );
}
