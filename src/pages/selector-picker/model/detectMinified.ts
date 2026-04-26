/**
 * Heuristic: returns true when the given HTML appears to be minified.
 *
 * Rules:
 * - Less than 5 lines → considered minified (collapsed source).
 * - Average line length above 200 chars → considered minified.
 */
export function isMinified(html: string): boolean {
  if (!html) return false;

  const lines = html.split("\n");
  if (lines.length < 5) return true;

  const avgLineLen = html.length / lines.length;
  return avgLineLen > 200;
}
