use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

/// Open (or focus) the sequence editor window.
/// `sequence_name = Some(name)` opens in edit mode; `None` opens a fresh form.
/// `url_seed = Some(url)` prefills the URL pattern for the new-sequence flow.
#[tauri::command]
pub async fn open_sequence_editor(
    app: AppHandle,
    sequence_name: Option<String>,
    url_seed: Option<String>,
) -> Result<(), String> {
    const LABEL: &str = "sequence-editor";

    if let Some(w) = app.get_webview_window(LABEL) {
        let _ = w.set_focus();
        return Ok(());
    }

    let mut params: Vec<String> = Vec::new();
    if let Some(n) = &sequence_name {
        params.push(format!("name={}", urlencoding::encode(n)));
    }
    if let Some(u) = &url_seed {
        params.push(format!("urlSeed={}", urlencoding::encode(u)));
    }

    let path = if params.is_empty() {
        "index.html#/sequence-editor".to_string()
    } else {
        format!("index.html#/sequence-editor?{}", params.join("&"))
    };

    let title = if sequence_name.is_some() {
        "시퀀스 편집"
    } else {
        "새 시퀀스"
    };

    WebviewWindowBuilder::new(&app, LABEL, WebviewUrl::App(path.into()))
        .title(title)
        .inner_size(720.0, 880.0)
        .resizable(true)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Open (or focus) the selector picker window.
/// `target_field` and `parent_label` are forwarded via URL hash query so the
/// frontend can route the picked value back to the originating field.
#[tauri::command]
pub async fn open_selector_picker(
    app: AppHandle,
    target_field: String,
    parent_label: String,
) -> Result<(), String> {
    const LABEL: &str = "selector-picker";

    if let Some(w) = app.get_webview_window(LABEL) {
        let _ = w.set_focus();
        return Ok(());
    }

    let path = format!(
        "index.html#/selector-picker?target={}&parent={}",
        urlencoding::encode(&target_field),
        urlencoding::encode(&parent_label),
    );

    WebviewWindowBuilder::new(&app, LABEL, WebviewUrl::App(path.into()))
        .title("셀렉터 등록")
        .inner_size(1100.0, 800.0)
        .resizable(true)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Close any window by label. Idempotent: missing label is a no-op.
#[tauri::command]
pub async fn close_window(app: AppHandle, label: String) -> Result<(), String> {
    if let Some(w) = app.get_webview_window(&label) {
        w.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}
