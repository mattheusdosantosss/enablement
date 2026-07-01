"use client";

import { useEffect, useState } from "react";

interface Deal { id: string; name: string; date: string; }

interface Props {
  ownerId: string;
  name: string;
  type: "raised" | "converted";
  mes: string;
  origin: string;
  onClose: () => void;
}

function formatDate(raw: string) {
  if (!raw) return "";
  const ts = Number(raw);
  const d = isNaN(ts) ? new Date(raw) : new Date(ts);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default function FarmerDealsModal({ ownerId, name, type, mes, origin, onClose }: Props) {
  const [deals, setDeals]     = useState<Deal[]>([]);
  const [portalId, setPortalId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    const p = new URLSearchParams({ ownerId, type, mes, origin });
    fetch(`/api/farmer-deals?${p}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { setDeals(d.deals ?? []); setPortalId(d.portalId ?? ""); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [ownerId, type, mes, origin]);

  // ESC fecha
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const titleLabel  = type === "raised" ? "Demandas levantadas" : "Negócios fechados";
  const countLabel  = type === "raised" ? "Demandas" : "Negócios";

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ background: "var(--s2)", borderRadius: 16, border: "1px solid var(--border)", width: "min(700px, 92vw)", maxHeight: "78vh", display: "flex", flexDirection: "column", boxShadow: "0 28px 72px rgba(0,0,0,0.75)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "24px 28px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>{titleLabel}</div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--orange)" }}>
              {name} · {loading ? "…" : `${deals.length} ${countLabel}`}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{ background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 16, width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Carregando...</div>
          )}
          {error && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--danger, #ff453a)", fontSize: 13 }}>Erro ao buscar negócios.</div>
          )}
          {!loading && !error && deals.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Nenhum negócio encontrado para o período.</div>
          )}
          {deals.map((deal, i) => (
            <div
              key={deal.id}
              style={{ display: "flex", alignItems: "center", gap: 16, padding: "13px 28px", borderBottom: "1px solid var(--border-soft)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: 11, color: "var(--faint)", fontVariantNumeric: "tabular-nums", minWidth: 22, fontWeight: 600, letterSpacing: "0.04em" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span style={{ flex: 1, fontSize: 14, color: "var(--text)", lineHeight: 1.4 }}>{deal.name}</span>
              {portalId && (
                <a
                  href={`https://app.hubspot.com/contacts/${portalId}/deal/${deal.id}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir no HubSpot"
                  style={{ color: "var(--muted)", fontSize: 15, textDecoration: "none", flexShrink: 0, lineHeight: 1 }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "var(--orange)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "var(--muted)")}
                >
                  ↗
                </a>
              )}
              <span style={{ fontSize: 12, color: "var(--muted)", fontVariantNumeric: "tabular-nums", minWidth: 60, textAlign: "right", flexShrink: 0 }}>
                {formatDate(deal.date)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
