import React from "react";
import ReactDOM from "react-dom/client";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { App } from "./app/App";
import { getCurrentRoute } from "./shared/router";
import { SequenceEditorPage } from "./pages/sequence-editor";
import { SelectorPickerPage } from "./pages/selector-picker";

const route = getCurrentRoute();
const Root =
  route === "sequence-editor" ? (
    <SequenceEditorPage />
  ) : route === "selector-picker" ? (
    <SelectorPickerPage />
  ) : (
    <App />
  );

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {Root}
    <ToastContainer
      position="bottom-right"
      newestOnTop
      autoClose={5000}
      pauseOnHover
    />
  </React.StrictMode>,
);
