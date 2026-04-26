import { useMemo } from "react";
import { cn } from "@/shared/lib/cn";

interface HtmlSourceViewProps {
  html: string;
  selectedLines: Set<number>;
  onLineClick: (lineNo: number) => void;
  clickableLines: Set<number>;
}

export function HtmlSourceView(props: HtmlSourceViewProps) {
  const { html, selectedLines, onLineClick, clickableLines } = props;

  const lines = useMemo(() => html.split("\n"), [html]);

  return (
    <div className="font-mono text-xs border rounded overflow-auto bg-zinc-50 dark:bg-zinc-900">
      {lines.map((text, i) => {
        const isSelected = selectedLines.has(i);
        const isClickable = clickableLines.has(i);
        return (
          <div
            key={i}
            data-line={i}
            data-testid={`html-line-${i}`}
            onClick={isClickable ? () => onLineClick(i) : undefined}
            className={cn(
              "flex items-start whitespace-pre",
              isClickable ? "cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950" : "opacity-60",
              isSelected && "bg-blue-100 dark:bg-blue-900",
            )}
          >
            <span className="select-none w-12 text-right pr-2 text-zinc-400 border-r mr-2 shrink-0">
              {i + 1}
            </span>
            <span className="break-all">{text}</span>
          </div>
        );
      })}
    </div>
  );
}
