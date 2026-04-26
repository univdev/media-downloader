import { useEffect, useState } from "react";
import { findSequenceByUrl } from "../api/findSequenceByUrl";
import { useDebounce } from "./useDebounce";
import type { MatchResult } from "./types";

export function useMatchSequence(url: string) {
  const debounced = useDebounce(url, 150);
  const [data, setData] = useState<MatchResult | null>(null);
  const [isMatching, setIsMatching] = useState(false);

  useEffect(() => {
    if (debounced.trim().length < 5) {
      setData(null);
      setIsMatching(false);
      return;
    }
    let cancelled = false;
    setIsMatching(true);
    findSequenceByUrl(debounced)
      .then((r) => {
        if (!cancelled) {
          setData(r);
          setIsMatching(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setIsMatching(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return { data, isMatching };
}
