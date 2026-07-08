"use client";

import { useRef, useEffect, useCallback } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const TOOLS = [
  { cmd: "bold",          label: "B",  title: "Negrito",      style: { fontWeight: 800 } as React.CSSProperties },
  { cmd: "italic",        label: "I",  title: "Itálico",      style: { fontStyle: "italic" } as React.CSSProperties },
  { cmd: "underline",     label: "U",  title: "Sublinhado",   style: { textDecoration: "underline" } as React.CSSProperties },
  { cmd: "strikeThrough", label: "S",  title: "Tachado",      style: { textDecoration: "line-through" } as React.CSSProperties },
];
const LISTS = [
  { cmd: "insertUnorderedList", label: "• ≡", title: "Lista com marcadores" },
  { cmd: "insertOrderedList",   label: "1 ≡", title: "Lista numerada"       },
];

function isEmpty(html: string) {
  return !html.replace(/<[^>]*>/g, "").trim();
}

export function getRawText(html: string) {
  return html.replace(/<[^>]*>/g, "").trim();
}

export default function RichTextEditor({
  value, onChange, placeholder = "Digite aqui...", minHeight = 160,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Sync from outside (e.g. form reset sets value to "")
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value]);

  const exec = useCallback((cmd: string, val?: string) => {
    document.execCommand(cmd, false, val ?? undefined);
    editorRef.current?.focus();
  }, []);

  function handleInput() {
    onChange(editorRef.current?.innerHTML ?? "");
  }

  const toolBtn: React.CSSProperties = {
    width: 30, height: 28, background: "none",
    border: "1px solid transparent", borderRadius: 6,
    cursor: "pointer", color: "var(--text-2)", fontSize: 12,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, transition: "background 0.1s, border-color 0.1s",
  };

  function onHover(e: React.MouseEvent<HTMLButtonElement>, enter: boolean) {
    (e.currentTarget as HTMLButtonElement).style.background = enter ? "var(--s3)" : "none";
    (e.currentTarget as HTMLButtonElement).style.borderColor = enter ? "var(--border)" : "transparent";
  }

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", background: "var(--s1)" }}
      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--orange)")}
      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
    >
      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 2,
        padding: "6px 10px", background: "var(--s2)",
        borderBottom: "1px solid var(--border-soft)",
      }}>
        {TOOLS.map((t) => (
          <button
            key={t.cmd}
            type="button"
            title={t.title}
            style={{ ...toolBtn, ...t.style }}
            onMouseDown={(e) => { e.preventDefault(); exec(t.cmd); }}
            onMouseEnter={(e) => onHover(e, true)}
            onMouseLeave={(e) => onHover(e, false)}
          >
            {t.label}
          </button>
        ))}

        <div style={{ width: 1, height: 18, background: "var(--border-soft)", margin: "0 6px" }} />

        {LISTS.map((t) => (
          <button
            key={t.cmd}
            type="button"
            title={t.title}
            style={{ ...toolBtn, fontSize: 11 }}
            onMouseDown={(e) => { e.preventDefault(); exec(t.cmd); }}
            onMouseEnter={(e) => onHover(e, true)}
            onMouseLeave={(e) => onHover(e, false)}
          >
            {t.label}
          </button>
        ))}

        <div style={{ width: 1, height: 18, background: "var(--border-soft)", margin: "0 6px" }} />

        {/* Limpar formatação */}
        <button
          type="button"
          title="Remover formatação"
          style={{ ...toolBtn, fontSize: 11 }}
          onMouseDown={(e) => { e.preventDefault(); exec("removeFormat"); }}
          onMouseEnter={(e) => onHover(e, true)}
          onMouseLeave={(e) => onHover(e, false)}
        >
          T×
        </button>
      </div>

      {/* Área de edição */}
      <div style={{ position: "relative" }}>
        {isEmpty(value) && (
          <div style={{
            position: "absolute", top: 12, left: 14,
            color: "var(--faint)", fontSize: 13, pointerEvents: "none",
            lineHeight: 1.6, userSelect: "none",
          }}>
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          style={{
            minHeight, padding: "12px 14px",
            outline: "none", color: "var(--text)", fontSize: 13, lineHeight: 1.65,
            overflowY: "auto",
          }}
        />
      </div>
    </div>
  );
}
