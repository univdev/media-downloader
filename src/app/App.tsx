import { TauriProvider } from "./providers/TauriProvider";
import { HomePage } from "@/pages/home";
import "./styles/index.css";

export function App() {
  return (
    <TauriProvider>
      <HomePage />
    </TauriProvider>
  );
}
