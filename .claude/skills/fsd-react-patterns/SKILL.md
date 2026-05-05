---
name: fsd-react-patterns
description: React 19 + TypeScript + FSD(Feature-Sliced Design) 아키텍처 코드를 작성할 때 사용한다. View/ViewModel 분리, 1-file-1-export, zustand store, Tauri invoke wrapper, react-toastify 통합 패턴을 다룬다. src/ 하위 신규 feature/widget을 추가하거나 기존 컴포넌트를 변경할 때 반드시 참조.
---

# fsd-react-patterns

Tauri 미디어 다운로더의 React 19 + TypeScript 코드 작성 패턴.

## 1. 작업 시작 전 필수 확인

- `src/widgets/media-toolbar/ui/MediaToolbar.tsx` + `MediaToolbar.viewmodel.ts` — View/ViewModel 분리 패턴
- `src/entities/sequence/model/useSequenceStore.ts` — zustand 패턴
- `src/features/start-download/api/startDownload.ts` — invoke wrapper 패턴
- `src/shared/lib/tauri.ts` — invoke 헬퍼
- `src/main.tsx` — root 마운트
- `package.json` — 사용 가능한 dep

## 2. FSD 레이어 규칙

엄격한 단방향 import:
```
shared → entities → features → widgets → pages → app
```

상위 레이어만 하위를 import 가능. 역방향/동등 레이어 cross import 금지. 새 feature는 `src/features/{feature-name}/` 하위에 다음 구조:

```
features/match-sequence/
├── index.ts              # public re-export (deep import 차단)
├── api/
│   └── findSequenceByUrl.ts
├── model/
│   ├── types.ts          # MatchResult interface
│   ├── useDebounce.ts
│   └── useMatchSequence.ts
└── ui/
    └── MatchPreview.tsx
```

## 3. 1-file-1-export 규칙

한 파일에 하나의 named export. 헬퍼 함수도 별도 파일로 분리. `index.ts`는 re-export 전용:

```ts
// src/features/match-sequence/index.ts
export { findSequenceByUrl } from "./api/findSequenceByUrl";
export { useMatchSequence } from "./model/useMatchSequence";
export { MatchPreview } from "./ui/MatchPreview";
export type { MatchResult } from "./model/types";
```

## 4. View/ViewModel 분리

UI 컴포넌트는 props만 받고 상태 로직 없음. ViewModel hook이 모든 hook과 상태를 모음.

```tsx
// MediaToolbar.tsx — View
interface MediaToolbarProps {
  url: string;
  matchedName: string | null;
  tiedCandidates: string[];
  canStart: boolean;
  isStarting: boolean;
  onUrlChange: (v: string) => void;
  onStartDownload: () => void;
  onOpenSettings: () => void;
}

export function MediaToolbar(props: MediaToolbarProps) {
  // pure render, no useState/useEffect
}
```

```ts
// MediaToolbar.viewmodel.ts — ViewModel
export function useMediaToolbarViewModel() {
  const [url, setUrl] = useState("");
  const { data: match, isMatching } = useMatchSequence(url);
  // ... 모든 hook + 상태 + 콜백
  return { url, setUrl, matchedName, ... };
}
```

`HomePage`에서 ViewModel 호출 후 결과를 View에 props로 전달.

## 5. Tauri invoke wrapper 패턴

`src/features/match-sequence/api/findSequenceByUrl.ts`:

```ts
import { invoke } from "@/shared/lib/tauri";
import type { MatchResult } from "../model/types";

export async function findSequenceByUrl(url: string): Promise<MatchResult | null> {
  return invoke<MatchResult | null>("find_sequence_by_url", { url });
}
```

**중요**:
- command 이름은 Rust 측 `#[tauri::command]` 함수명과 정확히 일치 (snake_case)
- 인자 객체 키는 Rust 측 인자명과 정확히 일치 (snake_case 그대로). Tauri v2는 자동 변환 안 함.
- 반환 타입은 Rust 측 `Result<T, E>`의 `T`. 에러는 throw됨.

## 6. MatchResult 타입

Rust 측 `#[derive(Serialize)] pub struct MatchResult { ... }`는 기본 snake_case 직렬화.
TS 인터페이스도 snake_case로 정의:

```ts
// src/features/match-sequence/model/types.ts
export interface MatchResult {
  sequence_name: string;
  url_pattern: string;
  captures: Record<string, string>;
  tied_candidates: string[];
}
```

## 7. useDebounce hook

```ts
// src/features/match-sequence/model/useDebounce.ts
import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
```

## 8. useMatchSequence hook (cancel flag)

```ts
// src/features/match-sequence/model/useMatchSequence.ts
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
      .then((r) => { if (!cancelled) { setData(r); setIsMatching(false); } })
      .catch(() => { if (!cancelled) { setData(null); setIsMatching(false); } });
    return () => { cancelled = true; };
  }, [debounced]);

  return { data, isMatching };
}
```

## 9. react-toastify 통합

설치:
```bash
pnpm add react-toastify
```

`src/main.tsx`에 추가 (기존 root 마운트 옆):
```tsx
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// React root 외부에 추가하거나 App 컴포넌트 내부에:
<ToastContainer
  position="bottom-right"
  newestOnTop
  autoClose={5000}
  pauseOnHover
/>
```

ViewModel에서 호출:
```tsx
import { toast } from "react-toastify";

useEffect(() => {
  if (!isMatching && url.trim().length >= 5 && match === null) {
    toast.error(
      <span>
        매칭되는 시퀀스가 없습니다.{" "}
        <button
          onClick={() => openCreateDialog({ urlPatternSeed: url })}
          className="underline ml-1"
        >
          시퀀스 만들기
        </button>
      </span>,
      { autoClose: 6000 }
    );
  }
}, [isMatching, match, url, openCreateDialog]);
```

`useEffect` 내 toast 호출 시 동일 url에 대해 중복 발사 주의 — `toastId` 옵션으로 중복 방지 가능: `{ toastId: 'no-match-' + url }`.

## 10. zustand store 패턴

기존 `useSequenceStore`/`useDownloadStore` 패턴 따름:

```ts
// src/features/manage-sequence/model/useSequenceDialogStore.ts (신규)
import { create } from "zustand";

interface SequenceDialogState {
  isOpen: boolean;
  urlPatternSeed: string | null;
  open: (opts?: { urlPatternSeed?: string }) => void;
  close: () => void;
}

export const useSequenceDialogStore = create<SequenceDialogState>((set) => ({
  isOpen: false,
  urlPatternSeed: null,
  open: (opts) => set({ isOpen: true, urlPatternSeed: opts?.urlPatternSeed ?? null }),
  close: () => set({ isOpen: false, urlPatternSeed: null }),
}));
```

기존 dialog 오픈 메커니즘이 있으면 재사용. 없으면 신규 store.

## 11. SequenceDialog prefill 연동

`useSequenceForm`에 옵셔널 prop 추가:
```ts
interface UseSequenceFormOptions {
  urlPatternSeed?: string;
  // ... 기존 옵션
}

export function useSequenceForm(options?: UseSequenceFormOptions) {
  const [urlPattern, setUrlPattern] = useState(options?.urlPatternSeed ?? "");
  // ...
}
```

`SequenceDialog`도 prop 추가하여 zustand store에서 받아 ViewModel에 전달.

## 12. MediaToolbar 리팩터 체크리스트

- `<select>` 요소와 관련 prop 모두 제거: `sequences`, `selectedName`, `onSelectSequence`, `onFetchSequences`
- 신규 prop: `matchedName`, `tiedCandidates`, `canStart`, `onUrlChange`
- `<MatchPreview matchedName={matchedName} tiedCandidates={tiedCandidates} />` 통합
- ▶ 버튼 disabled 조건: `!canStart || isStarting`
- HomePage의 호출부도 동시 갱신

## 13. 빌드 검증 정책

**본 스킬을 사용하는 에이전트는 `pnpm tsc --noEmit` / `pnpm test` / `pnpm build`를 실행하지 않는다.** 빌드/테스트 검증은 오케스트레이터가 모든 sub-task 완료 후 `integration-qa` 에이전트를 통해 단 한 번 일괄 실행한다.

예외: 본인이 명백히 도입한 타입 에러가 의심되는 큰 변경(import 경로 / 모델 깨짐)에 한해 한 번만 `pnpm tsc --noEmit`로 빠르게 확인 가능. vitest와 vite build는 sub-task 단계에서 호출하지 않는다.

## 14. 주의 사항

- React Query 도입 금지 (현재 `package.json`에 없음). 자체 hook + zustand로 충분.
- `@tauri-apps/api`의 invoke는 `src/shared/lib/tauri.ts`의 wrapper 통해서만 호출 (직접 import 금지 — FSD shared 레이어 활용).
- snake_case ↔ camelCase 변환 자동 안 됨. Tauri command 인자/반환 키를 정확히 따라쓴다.
- toast 호출 위치는 ViewModel만. View 컴포넌트에서 직접 toast 호출 금지.
