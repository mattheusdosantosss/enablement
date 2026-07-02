"use client";

import { useState, useEffect } from "react";
import { B2C_TEAM, B2B_TEAM, FARMER_SQUADS } from "@/lib/teams";
import type { FeedbackEntry } from "@/app/api/feedback/route";

const TEAMS = [
  { value: "b2b",     label: "B2B",     members: B2B_TEAM },
  { value: "b2c",     label: "B2C",     members: B2C_TEAM },
  {
    value: "farmers", label: "Farmers",
    members: FARMER_SQUADS.flatMap((s) =>
      s.members.map((email) => ({
        name: email.split("@")[0].replace(".", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        email,
      }))
    ),
  },
];

const TIPO_OPTIONS = [
  "Mentoria 1:1",
  "Coaching",
  "Shadowing",
  "Feedback formal",
  "Check-in de performance",
  "Treinamento em grupo",
];
const CARGA_OPTIONS = ["30 min", "45 min", "1h", "1h30", "2h"];
const GESTAO_OPTIONS = [
  "Nicollas Blanco Lenuzza",
  "Leandro Lara Bengochea",
  "Cesar Luiz dos Santos Filho",
  "Eduardo Tavares",
];

type Status = "idle" | "sending" | "ok" | "error";

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

/* ── HistoryItem ─────────────────────────────────────────────────────────── */
function HistoryItem({ item }: { item: FeedbackEntry }) {
  const [expanded, setExpanded] = useState(false);
  const long = item.text.length > 140;

  return (
    <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-soft)" }}>
      {/* Cabeçalho: avatar + nome + data */}
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
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-3)", flexShrink: 0, textAlign: "right" }}>
          {fmtDate(item.sentAt)}
        </div>
      </div>

      {/* Chips: tipo + carga + objetivo + nota */}
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

      {/* Texto do feedback */}
      <p style={{
        fontSize: 12, color: "var(--text-2)", lineHeight: 1.65, margin: 0,
        display: "-webkit-box",
        WebkitLineClamp: expanded ? undefined : 3,
        WebkitBoxOrient: "vertical" as const,
        overflow: expanded ? "visible" : "hidden",
        whiteSpace: "pre-wrap",
      }}>
        {item.text}
      </p>
      {long && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: "none", border: "none", padding: "4px 0 0", fontSize: 11,
            color: "var(--blue)", cursor: "pointer", fontWeight: 600,
          }}
        >
          {expanded ? "Ver menos" : "Ver mais"}
        </button>
      )}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function FeedbackPage() {
  const [team,        setTeam]        = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [tipo,        setTipo]        = useState("");
  const [carga,       setCarga]       = useState("");
  const [gestao,      setGestao]      = useState("");
  const [objetivo,    setObjetivo]    = useState("");
  const [nota,        setNota]        = useState(0);
  const [text,        setText]        = useState("");
  const [status,      setStatus]      = useState<Status>("idle");
  const [errMsg,      setErrMsg]      = useState("");

  const [history,     setHistory]     = useState<FeedbackEntry[]>([]);
  const [histLoading, setHistLoading] = useState(true);

  const selectedTeam   = TEAMS.find((t) => t.value === team);
  const selectedMember = selectedTeam?.members.find((m) => m.email === memberEmail);

  function fetchHistory() {
    fetch("/api/feedback")
      .then((r) => r.json())
      .then((d) => { setHistory(d.items ?? []); setHistLoading(false); })
      .catch(() => setHistLoading(false));
  }

  useEffect(() => { fetchHistory(); }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !team || !memberEmail) return;
    setStatus("sending"); setErrMsg("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team, memberName: selectedMember?.name ?? memberEmail,
          memberEmail, tipo: tipo || null, carga, gestao, objetivo,
          nota: nota > 0 ? nota : null, text,
        }),
      });
      if (res.ok) {
        setStatus("ok");
        setTeam(""); setMemberEmail(""); setTipo(""); setCarga(""); setGestao(""); setObjetivo(""); setNota(0); setText("");
        fetchHistory();
      } else {
        const d = await res.json().catch(() => ({}));
        setErrMsg(d.error || "Erro ao enviar.");
        setStatus("error");
      }
    } catch {
      setErrMsg("Falha de conexao."); setStatus("error");
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: "var(--font-psa), var(--font-sans)", fontSize: 22, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", margin: 0 }}>
          Feedback
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
          Escreva um feedback para qualquer membro do time comercial. O gestor do setor sera notificado por e-mail.
        </p>
      </div>

      {/* Layout 2 colunas: formulário | histórico */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 620px) minmax(0, 1fr)", gap: 24, alignItems: "start" }}>

        {/* ── Formulário ── */}
        <form className="card" onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card-head" style={{ marginBottom: 0 }}>
            <div>
              <div className="title">Novo Feedback</div>
              <div className="cap">Preencha todos os campos antes de enviar</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="flab">Time</label>
              <select className="finp" value={team} onChange={(e) => { setTeam(e.target.value); setMemberEmail(""); }} required>
                <option value="">Selecione o time...</option>
                {TEAMS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
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
              <label className="flab">Tipo de Sessao</label>
              <select className="finp" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="">Selecione...</option>
                {TIPO_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="flab">Carga Horaria</label>
              <select className="finp" value={carga} onChange={(e) => setCarga(e.target.value)}>
                <option value="">Selecione...</option>
                {CARGA_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="flab">Gestao</label>
              <select className="finp" value={gestao} onChange={(e) => setGestao(e.target.value)}>
                <option value="">Selecione...</option>
                {GESTAO_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="flab">Objetivo do Treinamento</label>
            <input className="finp" value={objetivo} onChange={(e) => setObjetivo(e.target.value)}
              placeholder="Descreva o objetivo do treinamento realizado..." style={{ fontSize: 13 }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="flab">Avaliacao do Colaborador</label>
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
            <textarea className="finp" value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Descreva o feedback de forma objetiva e construtiva..."
              rows={6} required style={{ resize: "vertical", lineHeight: 1.6 }} />
          </div>

          {selectedMember && (
            <div style={{ background: "var(--s2)", border: "1px solid var(--border-soft)", borderRadius: 10, padding: "12px 14px", fontSize: 12, color: "var(--text-3)" }}>
              O feedback sera enviado para o gestor do time <strong style={{ color: "var(--text)" }}>{selectedTeam?.label}</strong> com identificacao de <strong style={{ color: "var(--text)" }}>{selectedMember.name}</strong>.
            </div>
          )}

          {status === "ok" && (
            <div style={{ background: "rgba(70,209,127,0.1)", border: "1px solid rgba(70,209,127,0.3)", color: "#46d17f", borderRadius: 9, padding: "10px 14px", fontSize: 13 }}>
              Feedback enviado com sucesso! O gestor foi notificado por e-mail.
            </div>
          )}
          {status === "error" && <div className="ferro">{errMsg}</div>}

          <button className="btn" type="submit"
            disabled={status === "sending" || !team || !memberEmail || !text.trim()}
            style={{ alignSelf: "flex-start", padding: "10px 24px" }}>
            {status === "sending" ? "Enviando..." : "Salvar e Enviar"}
          </button>
        </form>

        {/* ── Histórico ── */}
        <div className="card" style={{ padding: 0, overflow: "hidden", position: "sticky", top: 32 }}>
          <div className="card-head" style={{ padding: "16px 16px 12px" }}>
            <div>
              <div className="title">Historico</div>
              <div className="cap">
                {histLoading ? "Carregando..." : `${history.length} feedback${history.length !== 1 ? "s" : ""} registrado${history.length !== 1 ? "s" : ""}`}
              </div>
            </div>
          </div>

          <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 220px)" }}>
            {histLoading ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
                Carregando historico...
              </div>
            ) : history.length === 0 ? (
              <div className="empty">Nenhum feedback enviado ainda.</div>
            ) : (
              history.map((item) => <HistoryItem key={item.id} item={item} />)
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
