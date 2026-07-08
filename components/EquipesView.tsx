"use client";

import { useState, useMemo, useEffect } from "react";
import type { FeedbackEntry } from "@/app/api/feedback/route";

export interface MemberStats {
  name: string;
  email: string;
  team: string;
  count: number;
  totalMin: number;
  gestao: string | null;
  coordenacao: string | null;
  allObjetivos: string[];
  tipoRecente: string | null;
  notaMedia: number | null;
  feedbacks: FeedbackEntry[];
}

type ViewMode = "cards" | "list";

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
}

function fmtMin(m: number): string {
  if (m === 0) return "—";
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h === 0) return `${min}min`;
  if (min === 0) return `${h}h`;
  return `${h}h ${min}min`;
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })
      + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function StarRating({ nota }: { nota: number }) {
  return (
    <span style={{ fontSize: 13, color: "#f5c518", letterSpacing: 1 }}>
      {"★".repeat(nota)}
      <span style={{ color: "rgba(255,255,255,0.2)" }}>{"★".repeat(5 - nota)}</span>
    </span>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "3px 9px",
      background: "rgba(255,106,26,0.12)", color: "var(--orange)",
      borderRadius: 20, border: "1px solid rgba(255,106,26,0.22)",
      whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

/* ── Modal de histórico do membro ─────────────────────────────────────────── */
function MemberFeedbackModal({ member, onClose }: { member: MemberStats; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />
      <div style={{
        position: "relative", zIndex: 1, width: "100%", maxWidth: 560,
        maxHeight: "82vh", display: "flex", flexDirection: "column",
        background: "#0d0f14", borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
      }}>
        {/* Cabeçalho */}
        <div style={{ padding: "20px 22px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="av" style={{ width: 40, height: 40, fontSize: 12 }}>
                {initials(member.name)}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#ffffff" }}>{member.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
                  {member.count} feedback{member.count !== 1 ? "s" : ""}
                  {member.totalMin > 0 && ` · ${fmtMin(member.totalMin)}`}
                  {member.notaMedia != null && ` · Nota média ${member.notaMedia.toFixed(1)}`}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8, cursor: "pointer", color: "rgba(255,255,255,0.6)",
                fontSize: 18, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Lista de feedbacks */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {member.feedbacks.length === 0 ? (
            <div style={{ padding: "48px 22px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
              Nenhum feedback registrado.
            </div>
          ) : (
            member.feedbacks.map((f, i) => (
              <div key={f.id} style={{
                padding: "16px 22px",
                borderBottom: i < member.feedbacks.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}>
                {/* Data + tipo + nota */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {f.tipo && (
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: "var(--orange)",
                        background: "rgba(255,106,26,0.12)", border: "1px solid rgba(255,106,26,0.22)",
                        borderRadius: 6, padding: "2px 9px",
                      }}>
                        {f.tipo}
                      </span>
                    )}
                    {f.carga && (
                      <span style={{
                        fontSize: 11, color: "rgba(255,255,255,0.55)",
                        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 6, padding: "2px 9px",
                      }}>
                        {f.carga}
                      </span>
                    )}
                    {f.nota && <StarRating nota={f.nota} />}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>
                    {fmtDate(f.sentAt)}
                  </div>
                </div>

                {/* Objetivo */}
                {f.objetivo && (
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
                    <span style={{ color: "rgba(255,255,255,0.25)", marginRight: 6 }}>Objetivo:</span>
                    {f.objetivo}
                  </div>
                )}

                {/* Texto */}
                <div
                  dangerouslySetInnerHTML={{ __html: f.text }}
                  style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.65 }}
                />

                {/* Enviado por */}
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 8 }}>
                  por {f.sentBy}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Card ──────────────────────────────────────────────────────────────────── */
function MemberCard({ m, onClick }: { m: MemberStats; onClick: () => void }) {
  const hasFeedback = m.count > 0;
  return (
    <div
      className="card"
      onClick={onClick}
      style={{ padding: "20px 22px", cursor: "pointer", transition: "border-color 0.15s" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--orange)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div className="av" style={{ width: 42, height: 42, fontSize: 13, flexShrink: 0 }}>
          {initials(m.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", lineHeight: 1.3 }}>{m.name}</div>
          <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{m.team}</div>
        </div>
        {m.notaMedia != null && (
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Nota</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#f5c518" }}>{m.notaMedia.toFixed(1)}</div>
          </div>
        )}
      </div>

      <div style={{ height: 1, background: "var(--border-soft)", marginBottom: 14 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        <CardRow label="Feedbacks realizados" value={String(m.count)} accent={hasFeedback} />
        <CardRow label="Mentoria técnica" value={fmtMin(m.totalMin)} />
        {m.tipoRecente && <CardRow label="Tipo (último)" value={m.tipoRecente} />}
        {m.gestao && <CardRow label="Gerência" value={m.gestao} />}
        {m.coordenacao && <CardRow label="Coordenação" value={m.coordenacao} />}
        {m.allObjetivos.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              {m.allObjetivos.length === 1 ? "Tag" : "Tags"}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {m.allObjetivos.map((t) => <Tag key={t} label={t} />)}
            </div>
          </div>
        )}
      </div>

      {!hasFeedback && (
        <div style={{ marginTop: 12, fontSize: 11, color: "var(--faint)", fontStyle: "italic" }}>
          Nenhum feedback registrado ainda.
        </div>
      )}

      {hasFeedback && (
        <div style={{ marginTop: 14, fontSize: 11, color: "var(--faint)", textAlign: "center" }}>
          Clique para ver histórico completo
        </div>
      )}
    </div>
  );
}

function CardRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: accent ? "var(--orange)" : "var(--text)", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
    </div>
  );
}

/* ── List row ──────────────────────────────────────────────────────────────── */
function MemberListRow({ m, i, onClick }: { m: MemberStats; i: number; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateColumns: "36px 1fr 80px 90px 80px 1fr",
        alignItems: "center",
        gap: 16,
        padding: "12px 20px",
        borderBottom: "1px solid var(--border-soft)",
        background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)")}
    >
      <div className="av" style={{ width: 34, height: 34, fontSize: 11 }}>
        {initials(m.name)}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{m.name}</div>
        <div style={{ fontSize: 11, color: "var(--faint)" }}>
          {m.tipoRecente ?? m.email}
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: m.count > 0 ? "var(--orange)" : "var(--muted)", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
        {m.count}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
        {fmtMin(m.totalMin)}
      </div>
      <div style={{ fontSize: 13, color: m.notaMedia != null ? "#f5c518" : "var(--faint)", fontWeight: 600 }}>
        {m.notaMedia != null ? `${m.notaMedia.toFixed(1)} ★` : "—"}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {m.allObjetivos.length > 0
          ? m.allObjetivos.map((t) => <Tag key={t} label={t} />)
          : <span style={{ color: "var(--faint)", fontSize: 12 }}>—</span>}
      </div>
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────────────────────── */
export default function EquipesView({ members }: { members: MemberStats[] }) {
  const [query, setQuery]                   = useState("");
  const [view, setView]                     = useState<ViewMode>("cards");
  const [selectedMember, setSelectedMember] = useState<MemberStats | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return members;
    return members.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }, [members, query]);

  const totalFeedbacks = members.reduce((s, m) => s + m.count, 0);
  const totalCarga     = members.reduce((s, m) => s + m.totalMin, 0);
  const membersComNota = members.filter((m) => m.notaMedia != null);
  const mediaGeral     = membersComNota.length > 0
    ? membersComNota.reduce((s, m) => s + (m.notaMedia ?? 0), 0) / membersComNota.length
    : null;

  return (
    <>
      {/* Resumo */}
      <div style={{
        display: "flex", alignItems: "center", gap: 24, marginBottom: 24,
        padding: "14px 20px", background: "var(--s2)",
        borderRadius: 12, border: "1px solid var(--border)",
      }}>
        <Kpi label="Membros"            value={String(members.length)}   color="var(--text)" />
        <Divider />
        <Kpi label="Total de feedbacks" value={String(totalFeedbacks)}   color="var(--orange)" />
        <Divider />
        <Kpi label="Carga total"        value={fmtMin(totalCarga)}       color="var(--text)" />
        {mediaGeral != null && (
          <>
            <Divider />
            <Kpi label="Nota média"     value={`${mediaGeral.toFixed(1)} ★`} color="#f5c518" />
          </>
        )}
      </div>

      {/* Barra de controles */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--faint)", pointerEvents: "none" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar colaborador..."
            style={{
              width: "100%", padding: "9px 12px 9px 36px",
              background: "var(--s2)", border: "1px solid var(--border)",
              borderRadius: 10, color: "var(--text)", fontSize: 13,
              outline: "none", boxSizing: "border-box",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--orange)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", color: "var(--faint)", fontSize: 16, lineHeight: 1,
            }}>×</button>
          )}
        </div>

        <div className="seg">
          <button
            onClick={() => setView("cards")}
            className={`seg-item${view === "cards" ? " active" : ""}`}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/>
              <rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>
            </svg>
            Cards
          </button>
          <button
            onClick={() => setView("list")}
            className={`seg-item${view === "list" ? " active" : ""}`}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
            Lista
          </button>
        </div>
      </div>

      {query && (
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
          {filtered.length === 0
            ? `Nenhum resultado para "${query}"`
            : `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""} para "${query}"`}
        </div>
      )}

      {/* Cards */}
      {view === "cards" && (
        filtered.length === 0 ? (
          <div className="card"><div className="empty">Nenhum membro encontrado.</div></div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {filtered.map((m) => (
              <MemberCard key={m.email} m={m} onClick={() => m.count > 0 && setSelectedMember(m)} />
            ))}
          </div>
        )
      )}

      {/* Lista */}
      {view === "list" && (
        filtered.length === 0 ? (
          <div className="card"><div className="empty">Nenhum membro encontrado.</div></div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "36px 1fr 80px 90px 80px 1fr",
              gap: 16, padding: "10px 20px",
              borderBottom: "1px solid var(--border)",
              background: "var(--s2)",
            }}>
              {["", "Colaborador", "Feedbacks", "Mentoria", "Nota", "Tags"].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  {h}
                </div>
              ))}
            </div>
            {filtered.map((m, i) => (
              <MemberListRow key={m.email} m={m} i={i} onClick={() => m.count > 0 && setSelectedMember(m)} />
            ))}
          </div>
        )
      )}

      {/* Modal drill-down */}
      {selectedMember && (
        <MemberFeedbackModal member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}
    </>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: "var(--font-psa), var(--font-mono)" }}>{value}</div>
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 36, background: "var(--border)", flexShrink: 0 }} />;
}
