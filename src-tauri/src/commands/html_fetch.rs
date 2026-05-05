use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::Duration;
use tokio::process::Command;
use tokio::time::timeout;

/// Maximum HTML body size accepted from `fetch_html` (10 MB).
///
/// Exposed (`pub(crate)`) so unit tests can reference the same constant
/// without duplicating the literal — keeps cap logic and tests in lockstep.
pub(crate) const MAX_HTML_SIZE: usize = 10 * 1024 * 1024;
const RENDER_TIMEOUT: Duration = Duration::from_secs(70);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderedElementRect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderedElement {
    pub selector: String,
    pub tag_name: String,
    pub source_url: Option<String>,
    pub rect: RenderedElementRect,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderedPagePayload {
    pub render_id: String,
    pub html: String,
    pub snapshot_data_url: Option<String>,
    pub viewport_width: f64,
    pub viewport_height: f64,
    pub elements: Vec<RenderedElement>,
}

#[derive(Debug, Deserialize)]
struct RenderedPageFromBrowser {
    pub html: String,
    pub snapshot_data_url: Option<String>,
    pub viewport_width: f64,
    pub viewport_height: f64,
    pub elements: Vec<RenderedElement>,
}

/// Pure size-check used inside `fetch_html`.
///
/// Split out from the async command so it can be unit-tested without
/// spinning up a real HTTP server. Returns the same error message the
/// command emits when the cap is exceeded.
pub(crate) fn check_html_size(len: usize) -> Result<(), String> {
    if len > MAX_HTML_SIZE {
        Err(format!("HTML too large: {} bytes (max {})", len, MAX_HTML_SIZE))
    } else {
        Ok(())
    }
}

/// Fetch raw HTML for the selector picker.
///
/// Uses `rquest` with Chrome 131 TLS fingerprint impersonation so that
/// anti-bot services (Cloudflare, BunnyShield, hand-rolled WAFs) which
/// drop non-browser TLS ClientHello packets — like hitomi.la — accept
/// the connection. `reqwest` is still used elsewhere for normal media
/// downloads where TLS fingerprinting is not an obstacle.
///
/// - 30s timeout
/// - 10 MB body cap
#[tauri::command]
pub async fn fetch_html(url: String) -> Result<String, String> {
    let client = rquest::Client::builder()
        .emulation(rquest_util::Emulation::Chrome131)
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }

    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;

    check_html_size(bytes.len())?;

    String::from_utf8(bytes.to_vec()).map_err(|e| e.to_string())
}

/// Render a page in a real headless Chromium instance and return the post-CSR
/// DOM plus a full-page PNG screenshot. The regular `fetch_html` command
/// remains the static HTML path for source-based selector picking.
#[tauri::command]
pub async fn fetch_rendered_page(
    _app: tauri::AppHandle,
    url: String,
) -> Result<RenderedPagePayload, String> {
    render_page_payload(&url, true).await
}

pub(crate) async fn render_page_payload(
    url: &str,
    include_snapshot: bool,
) -> Result<RenderedPagePayload, String> {
    let parsed = url::Url::parse(&url).map_err(|e| e.to_string())?;
    if !matches!(parsed.scheme(), "http" | "https") {
        return Err("URL은 http:// 또는 https://로 시작해야 합니다".to_string());
    }

    let repo_root = find_repo_root()
        .ok_or_else(|| "프로젝트 루트를 찾지 못했습니다.".to_string())?;
    let script = repo_root.join("scripts").join("render-page.mjs");

    let output = timeout(
        RENDER_TIMEOUT,
        {
            let mut command = Command::new("node");
            command
                .arg(&script)
                .arg(parsed.as_str())
                .current_dir(&repo_root)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());
            if !include_snapshot {
                command.arg("--no-screenshot");
            }
            command.output()
        },
    )
    .await
    .map_err(|_| "헤드리스 브라우저 렌더링 시간이 초과되었습니다.".to_string())?
    .map_err(|e| format!("헤드리스 브라우저 실행에 실패했습니다: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("헤드리스 브라우저 렌더링에 실패했습니다: {stderr}"));
    }

    let rendered: RenderedPageFromBrowser =
        serde_json::from_slice(&output.stdout).map_err(|e| e.to_string())?;
    let payload = RenderedPagePayload {
        render_id: "playwright".to_string(),
        html: rendered.html,
        snapshot_data_url: rendered.snapshot_data_url,
        viewport_width: rendered.viewport_width,
        viewport_height: rendered.viewport_height,
        elements: rendered.elements,
    };

    check_html_size(payload.html.len())?;
    Ok(payload)
}

fn find_repo_root() -> Option<PathBuf> {
    let mut dir = std::env::current_dir().ok()?;
    loop {
        if has_renderer_script(&dir) {
            return Some(dir);
        }
        if !dir.pop() {
            return None;
        }
    }
}

fn has_renderer_script(path: &Path) -> bool {
    path.join("package.json").exists() && path.join("scripts").join("render-page.mjs").exists()
}

/// Pretty-print HTML for display in the selector picker.
/// 1차 출시용 단순 휴리스틱 — 향후 정확도가 더 필요하면 html5ever 기반으로 교체.
#[tauri::command]
pub fn prettify_html(html: String) -> Result<String, String> {
    Ok(simple_indent(&html))
}

/// HTML void elements that never have a closing tag.
/// (Lowercased; comparison done case-insensitively.)
const VOID_ELEMENTS: &[&str] = &[
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
    "param", "source", "track", "wbr",
];

fn is_void_element(tag: &str) -> bool {
    let lower = tag.to_ascii_lowercase();
    VOID_ELEMENTS.iter().any(|v| *v == lower.as_str())
}

/// Extract the tag name from a token like `<div class="x">`, `</div>`, `<br/>`.
/// Returns lowercased tag name or empty string if unparseable.
fn parse_tag_name(token: &str) -> String {
    // Trim leading '<' and optional '/' and '!'.
    let stripped = token
        .trim_start_matches('<')
        .trim_start_matches('/')
        .trim_start_matches('!');
    let mut name = String::new();
    for ch in stripped.chars() {
        if ch.is_ascii_alphanumeric() || ch == '-' {
            name.push(ch.to_ascii_lowercase());
        } else {
            break;
        }
    }
    name
}

/// Simple HTML indenter.
///
/// Algorithm:
/// 1. Walk the input character by character; split into tokens of two kinds:
///    - tag tokens: `<...>`
///    - text tokens: anything between tags
/// 2. For each token, decide indent level *before* writing:
///    - `</tag>` → depth -= 1, write at new depth
///    - text / `<!-- -->` / `<!doctype>` / `<tag ...>` (open) / `<tag/>` (self-close) → write at current depth
///    - after writing an open tag that is NOT void and NOT self-closing → depth += 1
/// 3. Skip empty text tokens.
/// 4. `<script>`/`<style>`/`<pre>` content is treated as a single opaque text
///    block (kept as-is) to avoid mangling JS/CSS/preformatted content.
fn simple_indent(html: &str) -> String {
    let chars: Vec<char> = html.chars().collect();
    let mut out = String::with_capacity(html.len() + html.len() / 8);
    let mut depth: usize = 0;
    let mut i = 0usize;

    let push_indent = |out: &mut String, depth: usize| {
        if !out.is_empty() && !out.ends_with('\n') {
            out.push('\n');
        }
        for _ in 0..depth {
            out.push_str("  ");
        }
    };

    while i < chars.len() {
        if chars[i] == '<' {
            // Find end of tag '>'.
            let start = i;
            let mut j = i + 1;
            while j < chars.len() && chars[j] != '>' {
                j += 1;
            }
            if j >= chars.len() {
                // No closing '>': dump rest as text.
                out.extend(chars[start..].iter());
                break;
            }
            let tag_token: String = chars[start..=j].iter().collect();

            // Comment / doctype / processing instruction: keep on its own line.
            if tag_token.starts_with("<!--") || tag_token.starts_with("<!") || tag_token.starts_with("<?") {
                push_indent(&mut out, depth);
                out.push_str(&tag_token);
                i = j + 1;
                continue;
            }

            let is_close = tag_token.starts_with("</");
            let inner = &tag_token[1..tag_token.len() - 1]; // strip '<' '>'
            let is_self_close = inner.trim_end().ends_with('/');
            let name = parse_tag_name(&tag_token);

            if is_close {
                if depth > 0 {
                    depth -= 1;
                }
                push_indent(&mut out, depth);
                out.push_str(&tag_token);
                i = j + 1;
            } else {
                push_indent(&mut out, depth);
                out.push_str(&tag_token);
                i = j + 1;

                // Opaque blocks: copy raw content until matching closing tag,
                // then emit close tag at the same depth.
                if !is_self_close
                    && !is_void_element(&name)
                    && (name == "script" || name == "style" || name == "pre")
                {
                    let close_marker = format!("</{}", name);
                    let rest: String = chars[i..].iter().collect();
                    if let Some(rel) = rest.to_ascii_lowercase().find(&close_marker) {
                        // Append content as-is.
                        let content_end = i + rel;
                        out.extend(chars[i..content_end].iter());
                        // Now find closing '>' of the close tag.
                        let mut k = content_end;
                        while k < chars.len() && chars[k] != '>' {
                            k += 1;
                        }
                        if k < chars.len() {
                            let close_tag: String = chars[content_end..=k].iter().collect();
                            push_indent(&mut out, depth);
                            out.push_str(&close_tag);
                            i = k + 1;
                            continue;
                        }
                    }
                    // No closing tag found: dump rest.
                    out.extend(chars[i..].iter());
                    break;
                }

                if !is_self_close && !is_void_element(&name) && !name.is_empty() {
                    depth += 1;
                }
            }
        } else {
            // Text node up to next '<'.
            let start = i;
            while i < chars.len() && chars[i] != '<' {
                i += 1;
            }
            let text: String = chars[start..i].iter().collect();
            let trimmed = text.trim();
            if !trimmed.is_empty() {
                push_indent(&mut out, depth);
                out.push_str(trimmed);
            }
        }
    }

    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_indent_basic_nesting() {
        let html = "<div><p>hi</p></div>";
        let out = simple_indent(html);
        assert_eq!(out, "<div>\n  <p>\n    hi\n  </p>\n</div>");
    }

    #[test]
    fn test_simple_indent_void_elements_no_depth_change() {
        let html = "<div><br><img src=\"x\"><span>after</span></div>";
        let out = simple_indent(html);
        // br/img should not increase depth; span should be at depth 1.
        assert!(out.contains("\n  <br>"));
        assert!(out.contains("\n  <img"));
        assert!(out.contains("\n  <span>"));
        assert!(out.contains("\n    after"));
    }

    #[test]
    fn test_simple_indent_self_closing() {
        let html = "<div><input/><label>x</label></div>";
        let out = simple_indent(html);
        assert!(out.contains("\n  <input/>"));
        assert!(out.contains("\n  <label>"));
    }

    #[test]
    fn test_simple_indent_preserves_script_content() {
        let html = "<div><script>if(a<b){c=1}</script></div>";
        let out = simple_indent(html);
        // Script body kept verbatim, including the angle brackets inside.
        assert!(out.contains("if(a<b){c=1}"));
        assert!(out.contains("</script>"));
    }

    #[test]
    fn test_parse_tag_name_handles_attrs() {
        assert_eq!(parse_tag_name("<div class=\"x\">"), "div");
        assert_eq!(parse_tag_name("</span>"), "span");
        assert_eq!(parse_tag_name("<br/>"), "br");
        assert_eq!(parse_tag_name("<IMG src=y>"), "img");
    }

    // -----------------------------------------------------------------
    // Phase 9 보강: opaque 블록(style) 비-들여쓰기 + 깊은 중첩
    // -----------------------------------------------------------------

    #[test]
    fn test_simple_indent_preserves_style_block_verbatim() {
        // <style> 본문은 opaque 처리되어야 한다.
        // 내부의 `>` `{` `}` 같은 문자가 들여쓰기 알고리즘에 의해
        // 변형되지 않고 원본 그대로 보존돼야 한다.
        let html = "<head><style>.a > .b { color: red; }</style></head>";
        let out = simple_indent(html);
        assert!(
            out.contains(".a > .b { color: red; }"),
            "style body must be preserved verbatim, got:\n{out}"
        );
        assert!(out.contains("</style>"));
        // </style>는 자체 라인 + head 들여쓰기 깊이로 출력되어야 한다.
        assert!(
            out.contains("\n  </style>"),
            "</style> should be indented at head depth, got:\n{out}"
        );
    }

    #[test]
    fn test_simple_indent_deeply_nested_five_levels() {
        // 5단계 중첩 — 각 레벨이 2-space씩 더 들여써져야 한다.
        let html = "<a><b><c><d><e>x</e></d></c></b></a>";
        let out = simple_indent(html);
        // depth 0: <a>, depth 1: <b>, depth 2: <c>, depth 3: <d>,
        // depth 4: <e>, depth 5: x
        assert!(out.starts_with("<a>"), "depth 0 root: {out}");
        assert!(out.contains("\n  <b>"), "depth 1: {out}");
        assert!(out.contains("\n    <c>"), "depth 2: {out}");
        assert!(out.contains("\n      <d>"), "depth 3: {out}");
        assert!(out.contains("\n        <e>"), "depth 4: {out}");
        assert!(out.contains("\n          x"), "depth 5 text: {out}");
        // 닫는 태그도 동일 depth로 회귀
        assert!(out.contains("\n        </e>"));
        assert!(out.contains("\n      </d>"));
        assert!(out.contains("\n    </c>"));
        assert!(out.contains("\n  </b>"));
        assert!(out.ends_with("</a>"));
    }

    // -----------------------------------------------------------------
    // Phase 9 신규: fetch_html size cap 단위 테스트
    // -----------------------------------------------------------------

    #[test]
    fn test_check_html_size_below_cap_ok() {
        assert!(check_html_size(0).is_ok());
        assert!(check_html_size(1).is_ok());
        assert!(check_html_size(MAX_HTML_SIZE - 1).is_ok());
    }

    #[test]
    fn test_check_html_size_at_cap_ok_boundary() {
        // Boundary: cap 정확히 도달은 허용 (`>` 비교).
        assert!(check_html_size(MAX_HTML_SIZE).is_ok());
    }

    #[test]
    fn test_check_html_size_above_cap_errors_with_message() {
        let err = check_html_size(MAX_HTML_SIZE + 1).unwrap_err();
        assert!(
            err.contains("too large"),
            "error message should mention 'too large', got: {err}"
        );
        // 정확한 byte 수와 cap 값이 메시지에 노출돼야 사용자가 디버깅 가능.
        assert!(err.contains(&(MAX_HTML_SIZE + 1).to_string()));
        assert!(err.contains(&MAX_HTML_SIZE.to_string()));
    }

    // -----------------------------------------------------------------
    // 네트워크 통합 smoke (rquest TLS impersonation 검증)
    // 실행: `cargo test --release --lib smoke_ -- --ignored --nocapture`
    // -----------------------------------------------------------------

    #[tokio::test]
    #[ignore]
    async fn smoke_fetch_hitomi_with_chrome_emulation() {
        let r = fetch_html("https://hitomi.la/reader/3907279.html".to_string()).await;
        assert!(r.is_ok(), "fetch should succeed with Chrome131 TLS, got: {:?}", r.err());
        let html = r.unwrap();
        assert!(html.len() > 100, "html too short: {} bytes", html.len());
        // 페이지 정상 응답이면 <html> 또는 <!doctype> 포함
        let lower = html.to_lowercase();
        assert!(
            lower.contains("<html") || lower.contains("<!doctype"),
            "response does not look like HTML: {}",
            &html.chars().take(200).collect::<String>()
        );
    }
}
