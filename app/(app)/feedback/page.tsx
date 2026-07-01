"use client";

import { useState } from "react";
import { B2C_TEAM, B2B_TEAM, FARMER_SQUADS } from "@/lib/teams";

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

const CARGA_OPTIONS = ["20h", "30h", "40h", "Outro"];
const GESTAO_OPTIONS = ["Líder Tático", "Coordenador", "Gerente", "Diretor"];

type Status = "idle" | "sending" | "ok" | "error";

export default function FeedbackPage() {
  const [team,       setTeam]       = useState("");
  const [memberEmail,setMemberEmail]= useState("");
  const [carga,      setCarga]      = useState("");
  const [gestao,     setGestao]     = useState("");
  const [objetivo,   setObjetivo]   = useState("");
  const [text,       setText]       = useState("");
  const [status,     setStatus]     = useState<Status>("idle");
  const [errMsg,     setErrMsg]     = useState("");

  const selectedTeam   = TEAMS.find((t) => t.value === team);
  const selectedMember = selectedTeam?.members.find((m) => m.email === memberEmail);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !team || !memberEmail) return;
    setStatus("sending");
    setErrMsg("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team,
          memberName:  selectedMember?.name ?? memberEmail,
          memberEmail,
          carga,
          gestao,
          objetivo,
          text,
        }),
      });
      if (res.ok) {
        setStatus("ok");
        setTeam(""); setMemberEmail(""); setCarga(""); setGestao(""); setObjetivo(""); setText("");
      } else {
        const d = await res.json().catch(() => ({}));
        setErrMsg(d.error || "Erro ao enviar.");
        setStatus("error");
      }
    } catch {
      setErrMsg("Falha de conexao.");
      setStatus("error");
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

      <div style={{ maxWidth: 680 }}>
        <form className="card" onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card-head" style={{ marginBottom: 0 }}>
            <div>
              <div className="title">Novo Feedback</div>
              <div className="cap">Preencha todos os campos antes de enviar</div>
            </div>
          </div>

          {/* Time + Membro lado a lado */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="flab">Time</label>
              <select
                className="finp"
                value={team}
                onChange={(e) => { setTeam(e.target.value); setMemberEmail(""); }}
                required
              >
                <option value="">Selecione o time...</option>
                {TEAMS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="flab">Membro</label>
              <select
                className="finp"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                required
                disabled={!team}
              >
                <option value="">Selecione o membro...</option>
                {selectedTeam?.members.map((m) => (
                  <option key={m.email} value={m.email}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Carga Horaria + Gestao lado a lado */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="flab">Carga Horaria</label>
              <select
                className="finp"
                value={carga}
                onChange={(e) => setCarga(e.target.value)}
              >
                <option value="">Selecione...</option>
                {CARGA_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="flab">Gestao</label>
              <select
                className="finp"
                value={gestao}
                onChange={(e) => setGestao(e.target.value)}
              >
                <option value="">Selecione...</option>
                {GESTAO_OPTIONS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Objetivo do Treinamento */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="flab">Objetivo do Treinamento</label>
            <input
              className="finp"
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              placeholder="Descreva o objetivo do treinamento realizado..."
              style={{ fontSize: 13 }}
            />
          </div>

          {/* Feedback */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="flab">Feedback</label>
            <textarea
              className="finp"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Descreva o feedback de forma objetiva e construtiva..."
              rows={6}
              required
              style={{ resize: "vertical", lineHeight: 1.6 }}
            />
          </div>

          {selectedMember && (
            <div style={{
              background: "var(--panel-2)", border: "1px solid var(--border-soft)",
              borderRadius: 10, padding: "12px 14px", fontSize: 12, color: "var(--muted)",
            }}>
              O feedback sera enviado para o gestor do time <strong style={{ color: "var(--text)" }}>{selectedTeam?.label}</strong> com identificacao de <strong style={{ color: "var(--text)" }}>{selectedMember.name}</strong>.
            </div>
          )}

          {status === "ok" && (
            <div style={{ background: "rgba(70,209,127,0.1)", border: "1px solid rgba(70,209,127,0.3)", color: "#46d17f", borderRadius: 9, padding: "10px 14px", fontSize: 13 }}>
              Feedback enviado com sucesso! O gestor foi notificado por e-mail.
            </div>
          )}
          {status === "error" && (
            <div className="ferro">{errMsg}</div>
          )}

          <button
            className="btn"
            type="submit"
            disabled={status === "sending" || !team || !memberEmail || !text.trim()}
            style={{ alignSelf: "flex-start", padding: "10px 24px" }}
          >
            {status === "sending" ? "Enviando..." : "Salvar e Enviar"}
          </button>
        </form>
      </div>
    </div>
  );
}
