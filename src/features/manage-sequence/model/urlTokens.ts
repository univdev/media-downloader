export function replaceRange(
  value: string,
  start: number,
  end: number,
  replacement: string,
): string {
  const safeStart = Math.max(0, Math.min(start, value.length));
  const safeEnd = Math.max(safeStart, Math.min(end, value.length));
  return value.slice(0, safeStart) + replacement + value.slice(safeEnd);
}

export function toVariableToken(name: string): string {
  return `{${name}}`;
}

export function toIndexToken(start: number, to?: number): string {
  if (to === undefined || to === null) {
    return `{index:start=${start}}`;
  }
  return `{index:start=${start},to=${to}}`;
}

export function toWildcardToken(): string {
  return "{*}";
}
