"use client";

import { useState, useEffect } from "react";
import type { FeedbackEntry } from "@/app/api/feedback/route";
import RichTextEditor from "./RichTextEditor";

export interface TeamOption {
  value: string;
  label: string;
  members: { name: string; email: string }[];
}

const TIPO_OPTIONS = [
  "Mentoria 1:1",
  "Coaching",
  "Shadowing",
  "Feedback formal",
  "Check-in de performance",
  "Treinamento em grupo",
];
const CARGA_OPTIONS = ["30 min", "45 min", "1h", "1h30", "2h"];
const GERENCIA_OPTIONS = [
  "Nicollas Blanco Lenuzza",
  "Leandro Lara Bengochea",
  "Cesar Luiz dos Santos Filho",
  "Eduardo Tavares",
];
const COORD_BY_GERENCIA: Record<string, { email: string; name: string }[]> = {
  "Leandro Lara Bengochea": [
    { email: "katyeli.madril@profissionaissa.com",  name: "Katyeli Ceroni Madril"     },
    { email: "daniel.sias@profissionaissa.com",     name: "Daniel Bento Sias"         },
    { email: "leticia.santos@profissionaissa.com",  name: "Leticia Silva dos Santos"  },
  ],
  "Cesar Luiz dos Santos Filho": [
    { email: "eduardo.vince@profissionaissa.com",   name: "Eduardo Vince"             },
  ],
};

type Status = "idle" | "sending" | "ok" | "error";

function isEmptyHtml(html: string) {
  return !html.replace(/<[^>]*>/g, "").trim();
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })
      + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

const TEAM_COLOR: Record<string, string> = {
  B2B: "var(--blue)", B2C: "var(--orange)", Farmers: "#46d17f",
};

const actionBtn = (color?: string): React.CSSProperties => ({
  background: "none", border: "none", padding: "3px 8px", fontSize: 11,
  color: color ?? "var(--text-3)", cursor: "pointer", fontWeight: 600,
  borderRadius: 6,
});

/* ── HistoryItem ─────────────────────────────────────────────────────────── */
function HistoryItem({
  item, onDelete, onUpdate,
}: {
  item: FeedbackEntry;
  onDelete: (id: string) => void;
  onUpdate: (id: string, text: string) => void;
}) {
  const [expanded,   setExpanded]   = useState(false);
  const [editing,    setEditing]    = useState(false);
  const [editText,   setEditText]   = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  const plain = item.text.replace(/<[^>]*>/g, "");
  const long  = plain.length > 140;

  async function saveEdit() {
    if (isEmptyHtml(editText)) return;
    setSaving(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, text: editText }),
      });
      if (res.ok) { onUpdate(item.id, editText); setEditing(false); }
    } finally { setSaving(false); }
  }

  async function doDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      if (res.ok) onDelete(item.id);
    } finally { setDeleting(false); setConfirmDel(false); }
  }

  return (
    <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-soft)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="av" style={{ width: 34, height: 34, fontSize: 11, flexShrink: 0 }}>
            {initials(item.memberName)}
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>{item.memberName}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                background: TEAM_COLOR[item.team] ?? "var(--s3)",
                color: "#fff", borderRadius: 4, padding: "2px 7px",
              }}>
                {item.team}
              </span>
              {item.gestao && (
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>{item.gestao}</span>
              )}
              {item.coordenacao && (
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>· {item.coordenacao}</span>
              )}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-3)", flexShrink: 0, textAlign: "right" }}>
          {fmtDate(item.sentAt)}
        </div>
      </div>

      {/* Chips */}
      {(item.tipo || item.carga || item.objetivo || item.nota) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {item.tipo && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: "var(--orange)", background: "rgba(255,106,26,0.12)",
              border: "1px solid rgba(255,106,26,0.22)", borderRadius: 6, padding: "2px 9px",
            }}>
              {item.tipo}
            </span>
          )}
          {item.carga && (
            <span style={{
              fontSize: 11, color: "var(--text-2)", background: "var(--s3)",
              border: "1px solid var(--border)", borderRadius: 6, padding: "2px 9px",
            }}>
              {item.carga}
            </span>
          )}
          {item.objetivo && (
            <span style={{
              fontSize: 11, color: "var(--text-3)", background: "var(--s2)",
              border: "1px solid var(--border-soft)", borderRadius: 6, padding: "2px 9px",
              maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }} title={item.objetivo}>
              {item.objetivo}
            </span>
          )}
          {item.nota && (
            <span style={{
              fontSize: 12, color: "#f5c518", letterSpacing: 1,
              background: "var(--s3)", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 9px",
            }}>
              {"★".repeat(item.nota)}{"☆".repeat(5 - item.nota)}
            </span>
          )}
        </div>
      )}

      {/* Editor ou texto */}
      {editing ? (
        <div style={{ marginTop: 4 }}>
          <RichTextEditor value={editText} onChange={setEditText} minHeight={120}
            placeholder="Edite o feedback..." />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="btn" type="button" onClick={saveEdit} disabled={saving}
              style={{ padding: "6px 16px", fontSize: 12 }}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button type="button" onClick={() => setEditing(false)} style={{
              background: "none", border: "1px solid var(--border)", borderRadius: 8,
              padding: "6px 12px", fontSize: 12, color: "var(--text-2)", cursor: "pointer",
            }}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            dangerouslySetInnerHTML={{ __html: item.text }}
            style={{
              fontSize: 12, color: "var(--text-2)", lineHeight: 1.65, margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: expanded ? undefined : 3,
              WebkitBoxOrient: "vertical" as const,
              overflow: expanded ? "visible" : "hidden",
            }}
          />
          {long && (
            <button type="button" onClick={() => setExpanded(!expanded)}
              style={{ background: "none", border: "none", padding: "4px 0 0", fontSize: 11, color: "var(--blue)", cursor: "pointer", fontWeight: 600 }}>
              {expanded ? "Ver menos" : "Ver mais"}
            </button>
          )}

          {/* Ações */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, paddingTop: 6, borderTop: "1px solid var(--border-soft)" }}>
            <button type="button"
              onClick={() => { setEditing(true); setEditText(item.text); setConfirmDel(false); }}
              style={actionBtn()}>
              ✏ Editar
            </button>
            {confirmDel ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 4 }}>
                <span style={{ fontSize: 11, color: "var(--text-2)" }}>Tem certeza?</span>
                <button type="button" onClick={doDelete} disabled={deleting} style={{
                  ...actionBtn("#f56565"),
                  background: "rgba(245,101,101,0.08)", border: "1px solid rgba(245,101,101,0.25)",
                  padding: "3px 10px", borderRadius: 6,
                }}>
                  {deleting ? "..." : "Confirmar"}
                </button>
                <button type="button" onClick={() => setConfirmDel(false)} style={actionBtn()}>
                  Cancelar
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDel(true)} style={actionBtn()}>
                🗑 Excluir
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────────────────── */
export default function FeedbackClient({ teams }: { teams: TeamOption[] }) {
  const [team,        setTeam]        = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [tipo,        setTipo]        = useState("");
  const [carga,       setCarga]       = useState("");
  const [gestao,      setGestao]      = useState("");
  const [coordenacao, setCoordenacao] = useState("");
  const [objetivo,    setObjetivo]    = useState("");
  const [nota,        setNota]        = useState(0);
  const [text,        setText]        = useState("");
  const [status,      setStatus]      = useState<Status>("idle");
  const [errMsg,      setErrMsg]      = useState("");

  const [history,     setHistory]     = useState<FeedbackEntry[]>([]);
  const [histLoading, setHistLoading] = useState(true);

  const selectedTeam      = teams.find((t) => t.value === team);
  const selectedMember    = selectedTeam?.members.find((m) => m.email === memberEmail);
  const coordsForGerencia = COORD_BY_GERENCIA[gestao] ?? [];
  const selectedCoord     = coordsForGerencia.find((c) => c.email === coordenacao);

  function fetchHistory() {
    fetch("/api/feedback")
      .then((r) => r.json())
      .then((d) => { setHistory(d.items ?? []); setHistLoading(false); })
      .catch(() => setHistLoading(false));
  }

  useEffect(() => { fetchHistory(); }, []);

  function handleDelete(id: string) {
    setHistory((h) => h.filter((i) => i.id !== id));
  }

  function handleUpdate(id: string, newText: string) {
    setHistory((h) => h.map((i) => (i.id === id ? { ...i, text: newText } : i)));
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (isEmptyHtml(text) || !team || !memberEmail) return;
    setStatus("sending"); setErrMsg("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team, memberName: selectedMember?.name ?? memberEmail,
          memberEmail, tipo: tipo || null, carga,
          gestao: gestao || null,
          coordenacao: selectedCoord?.name ?? null,
          coordenacaoEmail: selectedCoord?.email ?? null,
          objetivo, nota: nota > 0 ? nota : null, text,
        }),
      });
      if (res.ok) {
        setStatus("ok");
        setTeam(""); setMemberEmail(""); setTipo(""); setCarga("");
        setGestao(""); setCoordenacao(""); setObjetivo(""); setNota(0); setText("");
        fetchHistory();
      } else {
        const d = await res.json().catch(() => ({}));
        setErrMsg(d.error || "Erro ao enviar.");
        setStatus("error");
      }
    } catch {
      setErrMsg("Falha de conexão."); setStatus("error");
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: "var(--font-psa), var(--font-sans)", fontSize: 22, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", margin: 0 }}>
          Feedback
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
          Escreva um feedback para qualquer membro do time comercial. O gestor do setor será notificado por e-mail.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 620px) minmax(0, 1fr)", gap: 24, alignItems: "start" }}>

        {/* Formulário */}
        <form className="card" onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card-head" style={{ marginBottom: 0 }}>
            <div>
              <div className="title">Novo Feedback</div>
              <div className="cap">Preencha os campos antes de enviar</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="flab">Time</label>
              <select className="finp" value={team} onChange={(e) => { setTeam(e.target.value); setMemberEmail(""); }} required>
                <option value="">Selecione o time...</option>
                {teams.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="flab">Membro</label>
              <select className="finp" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} required disabled={!team}>
                <option value="">Selecione o membro...</option>
                {selectedTeam?.members.map((m) => <option key={m.email} value={m.email}>{m.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="flab">Tipo de Sessão</label>
              <select className="finp" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="">Selecione...</option>
                {TIPO_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="flab">Carga Horária</label>
              <select className="finp" value={carga} onChange={(e) => setCarga(e.target.value)}>
                <option value="">Selecione...</option>
                {CARGA_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="flab">Gerência</label>
              <select className="finp" value={gestao} onChange={(e) => {
                setGestao(e.target.value);
                setCoordenacao("");
              }}>
                <option value="">Selecione...</option>
                {GERENCIA_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          {coordsForGerencia.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="flab">Coordenação</label>
              <select className="finp" value={coordenacao} onChange={(e) => setCoordenacao(e.target.value)}>
                <option value="">Selecione a coordenação...</option>
                {coordsForGerencia.map((c) => (
                  <option key={c.email} value={c.email}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="flab">Objetivo do Treinamento</label>
            <input className="finp" value={objetivo} onChange={(e) => setObjetivo(e.target.value)}
              placeholder="Descreva o objetivo do treinamento realizado..." style={{ fontSize: 13 }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="flab">Avaliação do Colaborador</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNota(nota === n ? 0 : n)}
                  style={{
                    width: 38, height: 38,
                    background: nota >= n ? "rgba(255,106,26,0.15)" : "var(--s3)",
                    border: `1px solid ${nota >= n ? "var(--orange)" : "var(--border)"}`,
                    borderRadius: 8, cursor: "pointer",
                    color: nota >= n ? "var(--orange)" : "var(--muted)",
                    fontSize: 20, lineHeight: 1, transition: "all 0.12s",
                  }}
                >
                  ★
                </button>
              ))}
              {nota > 0 && (
                <span style={{ fontSize: 12, color: "var(--text-3)", marginLeft: 4 }}>
                  {nota}/5
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="flab">Feedback</label>
            <RichTextEditor
              value={text}
              onChange={setText}
              placeholder="Descreva o feedback de forma objetiva e construtiva..."
            />
          </div>

          {selectedMember && (
            <div style={{ background: "var(--s2)", border: "1px solid var(--border-soft)", borderRadius: 10, padding: "12px 14px", fontSize: 12, color: "var(--text-3)" }}>
              O feedback será enviado para o gestor do time <strong style={{ color: "var(--text)" }}>{selectedTeam?.label}</strong> com identificação de <strong style={{ color: "var(--text)" }}>{selectedMember.name}</strong>.
            </div>
          )}

          {status === "ok" && (
            <div style={{ background: "rgba(70,209,127,0.1)", border: "1px solid rgba(70,209,127,0.3)", color: "#46d17f", borderRadius: 9, padding: "10px 14px", fontSize: 13 }}>
              Feedback enviado com sucesso! O gestor foi notificado por e-mail.
            </div>
          )}
          {status === "error" && <div className="ferro">{errMsg}</div>}

          <button className="btn" type="submit"
            disabled={status === "sending" || !team || !memberEmail || isEmptyHtml(text)}
            style={{ alignSelf: "flex-start", padding: "10px 24px" }}>
            {status === "sending" ? "Enviando..." : "Salvar e Enviar"}
          </button>
        </form>

        {/* Histórico */}
        <div className="card" style={{ padding: 0, overflow: "hidden", position: "sticky", top: 32 }}>
          <div className="card-head" style={{ padding: "16px 16px 12px" }}>
            <div>
              <div className="title">Histórico</div>
              <div className="cap">
                {histLoading ? "Carregando..." : `${history.length} feedback${history.length !== 1 ? "s" : ""} registrado${history.length !== 1 ? "s" : ""}`}
              </div>
            </div>
          </div>

          <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 220px)" }}>
            {histLoading ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
                Carregando histórico...
              </div>
            ) : history.length === 0 ? (
              <div className="empty">Nenhum feedback enviado ainda.</div>
            ) : (
              history.map((item) => (
                <HistoryItem
                  key={item.id}
                  item={item}
                  onDelete={handleDelete}
                  onUpdate={handleUpdate}
                />
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
