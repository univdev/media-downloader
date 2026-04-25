import type { ReactNode } from "react";

interface TauriProviderProps {
  children: ReactNode;
}

export function TauriProvider({ children }: TauriProviderProps) {
  return <>{children}</>;
}
