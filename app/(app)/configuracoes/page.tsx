"use client";

import { useEffect, useState, useCallback } from "react";

interface Member { name: string; email: string; }
interface Squad  { id: string; label: string; members: Member[]; }
interface Config { b2b: Member[]; b2c: Member[]; farmerSquads: Squad[]; }
interface HsOwner { name: string; email: string; }

type Tab = "b2b" | "b2c" | "farmers";

/* ── helpers ─────────────────────────────────────────────────────────────── */
function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
}

/* ── Owner search form ───────────────────────────────────────────────────── */
function AddOwnerForm({
  owners,
  existingEmails,
  onAdd,
  placeholder,
}: {
  owners: HsOwner[];
  existingEmails: Set<string>;
  onAdd: (m: Member) => void;
  placeholder?: string;
}) {
  const [query,    setQuery]    = useState("");
  const [focused,  setFocused]  = useState(false);
  const [selected, setSelected] = useState<HsOwner | null>(null);

  const available = owners.filter((o) => !existingEmails.has(o.email));
  const filtered  = query.length > 0
    ? available.filter((o) =>
        o.name.toLowerCase().includes(query.toLowerCase()) ||
        o.email.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : available.slice(0, 8);

  const showDropdown = focused && filtered.length > 0;

  function pick(o: HsOwner) {
    setSelected(o);
    setQuery(o.name);
    setFocused(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const m = selected ?? available.find((o) => o.name === query || o.email === query);
    if (!m) return;
    onAdd(m);
    setQuery(""); setSelected(null);
  }

  return (
    <form onSubmit={submit} style={{ padding: "12px 14px", background: "var(--panel-3)", borderTop: "1px solid var(--border-soft)" }}>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <input
            className="finp"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder={placeholder ?? "Buscar colaborador no HubSpot..."}
            style={{ width: "100%", fontSize: 12, padding: "8px 10px" }}
            autoComplete="off"
          />
          {showDropdown && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
              background: "var(--panel-2)", border: "1px solid var(--border)",
              borderRadius: "0 0 9px 9px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              maxHeight: 260, overflowY: "auto",
            }}>
              {filtered.map((o) => (
                <button
                  key={o.email}
                  type="button"
                  onMouseDown={() => pick(o)}
                  style={{
                    width: "100%", textAlign: "left", background: "none", border: "none",
                    padding: "9px 12px", cursor: "pointer", display: "flex", gap: 10,
                    alignItems: "center", borderBottom: "1px solid var(--border-soft)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--panel-3)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <span className="av" style={{ width: 26, height: 26, fontSize: 9, flexShrink: 0 }}>{initials(o.name)}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{o.name}</div>
                    <div style={{ fontSize: 10, color: "var(--faint)" }}>{o.email}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={!selected}
          style={{
            background: selected ? "var(--accent)" : "var(--panel-2)",
            color: selected ? "#1a0a00" : "var(--faint)",
            border: "none", borderRadius: 9,
            padding: "8px 16px", fontWeight: 700, fontSize: 12, cursor: selected ? "pointer" : "default",
            fontFamily: "var(--font-psa), var(--font-sans)", letterSpacing: "0.04em",
            whiteSpace: "nowrap", transition: "all .15s",
          }}
        >
          + Adicionar
        </button>
      </div>
    </form>
  );
}

/* ── MemberRow ───────────────────────────────────────────────────────────── */
function MemberRow({ member, onRemove, onMove, squadOptions, currentSquad }: {
  member: Member;
  onRemove: () => void;
  onMove?: (targetSquad: string) => void;
  squadOptions?: { id: string; label: string }[];
  currentSquad?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderBottom: "1px solid var(--border-soft)" }}>
      <span className="av">{initials(member.name)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{member.name}</div>
        <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 1 }}>{member.email}</div>
      </div>
      {squadOptions && onMove && (
        <select
          value={currentSquad ?? ""}
          onChange={(e) => onMove(e.target.value)}
          style={{
            background: "var(--panel-2)", border: "1px solid var(--border)", color: "var(--muted)",
            borderRadius: 7, padding: "4px 8px", fontSize: 11, outline: "none", cursor: "pointer",
          }}
        >
          {squadOptions.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      )}
      <button
        onClick={onRemove}
        title="Remover"
        style={{
          background: "none", border: "1px solid var(--border)", color: "var(--faint)", borderRadius: 7,
          width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", fontSize: 14, flexShrink: 0, transition: "all .15s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--red)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--red)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--faint)"; }}
      >
        x
      </button>
    </div>
  );
}

/* ── TabBtn ──────────────────────────────────────────────────────────────── */
function TabBtn({ label, active, count, onClick }: {
  label: string; active: boolean; count?: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "none", cursor: "pointer",
        padding: "9px 20px",
        fontFamily: "var(--font-psa), var(--font-sans)",
        fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
        borderRadius: "10px 10px 0 0",
        color: active ? "var(--accent)" : "var(--muted)",
        background: active ? "var(--accent-soft)" : "transparent",
        borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
        transition: "all .15s",
        display: "flex", alignItems: "center", gap: 8,
      }}
    >
      {label}
      {count !== undefined && (
        <span style={{ fontSize: 10, fontFamily: "var(--font-mono), monospace", background: "var(--panel-3)", border: "1px solid var(--border)", borderRadius: 99, padding: "1px 7px", color: "var(--faint)" }}>
          {count}
        </span>
      )}
    </button>
  );
}

/* ── Squad sub-tabs ──────────────────────────────────────────────────────── */
function SquadTabBtn({ label, active, count, onClick }: {
  label: string; active: boolean; count: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "none", cursor: "pointer",
        padding: "7px 16px",
        fontFamily: "var(--font-psa), var(--font-sans)",
        fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
        borderRadius: "8px 8px 0 0",
        color: active ? "var(--blue-psa)" : "var(--muted)",
        background: active ? "var(--blue-psa-soft)" : "transparent",
        borderBottom: active ? `2px solid var(--blue-psa)` : "2px solid transparent",
        transition: "all .15s",
        display: "flex", alignItems: "center", gap: 7,
      }}
    >
      {label}
      <span style={{ fontSize: 10, background: "var(--panel-3)", border: "1px solid var(--border)", borderRadius: 99, padding: "1px 6px", color: "var(--faint)" }}>
        {count}
      </span>
    </button>
  );
}

/* ── main page ───────────────────────────────────────────────────────────── */
export default function ConfiguracoesPage() {
  const [config,      setConfig]      = useState<Config | null>(null);
  const [owners,      setOwners]      = useState<HsOwner[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [status,      setStatus]      = useState<"idle" | "saved" | "error">("idle");
  const [tab,         setTab]         = useState<Tab>("b2b");
  const [activeSquad, setActiveSquad] = useState<string>("");

  useEffect(() => {
    fetch("/api/configuracoes")
      .then((r) => r.json())
      .then((d: Config) => {
        setConfig(d);
        if (d.farmerSquads?.[0]) setActiveSquad(d.farmerSquads[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch("/api/hs-owners")
      .then((r) => r.json())
      .then((d: { owners: HsOwner[] }) => setOwners(d.owners ?? []))
      .catch(() => {});
  }, []);

  const save = useCallback(async (next: Config) => {
    setSaving(true); setStatus("idle");
    try {
      const r = await fetch("/api/configuracoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      setStatus(r.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
      setTimeout(() => setStatus("idle"), 3000);
    }
  }, []);

  function addB2B(m: Member)    { const n = { ...config!, b2b: [...config!.b2b, m] }; setConfig(n); save(n); }
  function removeB2B(i: number) { const n = { ...config!, b2b: config!.b2b.filter((_, idx) => idx !== i) }; setConfig(n); save(n); }
  function addB2C(m: Member)    { const n = { ...config!, b2c: [...config!.b2c, m] }; setConfig(n); save(n); }
  function removeB2C(i: number) { const n = { ...config!, b2c: config!.b2c.filter((_, idx) => idx !== i) }; setConfig(n); save(n); }

  function addToSquad(squadId: string, m: Member) {
    const n = { ...config!, farmerSquads: config!.farmerSquads.map((s) => s.id === squadId ? { ...s, members: [...s.members, m] } : s) };
    setConfig(n); save(n);
  }
  function removeFromSquad(squadId: string, email: string) {
    const n = { ...config!, farmerSquads: config!.farmerSquads.map((s) => s.id === squadId ? { ...s, members: s.members.filter((m) => m.email !== email) } : s) };
    setConfig(n); save(n);
  }
  function moveMember(email: string, fromSquad: string, toSquad: string) {
    if (fromSquad === toSquad) return;
    const member = config!.farmerSquads.find((s) => s.id === fromSquad)?.members.find((m) => m.email === email);
    if (!member) return;
    const n = {
      ...config!,
      farmerSquads: config!.farmerSquads.map((s) => {
        if (s.id === fromSquad) return { ...s, members: s.members.filter((m) => m.email !== email) };
        if (s.id === toSquad)   return { ...s, members: [...s.members, member] };
        return s;
      }),
    };
    setConfig(n); save(n);
  }

  const currentSquad = config?.farmerSquads.find((s) => s.id === activeSquad);
  const squadIds     = config?.farmerSquads.map((s) => ({ id: s.id, label: s.label })) ?? [];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-psa), var(--font-sans)", fontSize: 22, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", margin: 0, color: "var(--text)" }}>
            Configuracoes
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
            Gerencie os membros de cada equipe comercial
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {saving && <span style={{ fontSize: 12, color: "var(--faint)" }}>Salvando...</span>}
          {status === "saved" && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(70,209,127,0.1)", border: "1px solid rgba(70,209,127,0.3)", borderRadius: 9, padding: "8px 14px", fontSize: 12, color: "var(--green)" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Salvo
            </div>
          )}
          {status === "error" && (
            <div style={{ background: "rgba(255,90,90,0.1)", border: "1px solid rgba(255,90,90,0.3)", borderRadius: 9, padding: "8px 14px", fontSize: 12, color: "var(--red)" }}>
              Erro ao salvar
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div style={{ color: "var(--faint)", fontSize: 13, padding: "40px 0", textAlign: "center" }}>Carregando...</div>
      )}

      {!loading && config && (
        <>
          {/* Tabs principais */}
          <div style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--border-soft)", marginBottom: 24 }}>
            <TabBtn label="B2B"     active={tab === "b2b"}     count={config.b2b.length}     onClick={() => setTab("b2b")} />
            <TabBtn label="B2C"     active={tab === "b2c"}     count={config.b2c.length}     onClick={() => setTab("b2c")} />
            <TabBtn label="Farmers" active={tab === "farmers"} count={config.farmerSquads.reduce((s, sq) => s + sq.members.length, 0)} onClick={() => setTab("farmers")} />
          </div>

          {/* B2B */}
          {tab === "b2b" && (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="card-head" style={{ padding: "16px 14px 12px" }}>
                <div><div className="title">Closers B2B</div><div className="cap">{config.b2b.length} membro{config.b2b.length !== 1 ? "s" : ""}</div></div>
              </div>
              {config.b2b.length === 0 && <div className="empty">Nenhum membro. Adicione abaixo.</div>}
              {config.b2b.map((m, i) => (
                <MemberRow key={m.email + i} member={m} onRemove={() => removeB2B(i)} />
              ))}
              <AddOwnerForm owners={owners} existingEmails={new Set(config.b2b.map((m) => m.email))} onAdd={addB2B} />
            </div>
          )}

          {/* B2C */}
          {tab === "b2c" && (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="card-head" style={{ padding: "16px 14px 12px" }}>
                <div><div className="title">Closers B2C</div><div className="cap">{config.b2c.length} membro{config.b2c.length !== 1 ? "s" : ""}</div></div>
              </div>
              {config.b2c.length === 0 && <div className="empty">Nenhum membro. Adicione abaixo.</div>}
              {config.b2c.map((m, i) => (
                <MemberRow key={m.email + i} member={m} onRemove={() => removeB2C(i)} />
              ))}
              <AddOwnerForm owners={owners} existingEmails={new Set(config.b2c.map((m) => m.email))} onAdd={addB2C} />
            </div>
          )}

          {/* Farmers - sub-abas por squad */}
          {tab === "farmers" && (
            <div>
              {/* Sub-tabs squad */}
              <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border-soft)", marginBottom: 20 }}>
                {config.farmerSquads.map((sq) => (
                  <SquadTabBtn
                    key={sq.id}
                    label={sq.label}
                    active={activeSquad === sq.id}
                    count={sq.members.length}
                    onClick={() => setActiveSquad(sq.id)}
                  />
                ))}
              </div>

              {/* Card do squad ativo */}
              {currentSquad && (
                <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                  <div className="card-head" style={{ padding: "14px 14px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--blue-psa)", display: "inline-block", flexShrink: 0 }} />
                      <div>
                        <div className="title">{currentSquad.label}</div>
                        <div className="cap">{currentSquad.members.length} farmer{currentSquad.members.length !== 1 ? "s" : ""}</div>
                      </div>
                    </div>
                  </div>
                  {currentSquad.members.length === 0 && <div className="empty">Squad vazio.</div>}
                  {currentSquad.members.map((m) => (
                    <MemberRow
                      key={m.email}
                      member={m}
                      onRemove={() => removeFromSquad(currentSquad.id, m.email)}
                      squadOptions={squadIds}
                      currentSquad={currentSquad.id}
                      onMove={(targetId) => moveMember(m.email, currentSquad.id, targetId)}
                    />
                  ))}
                  <AddOwnerForm
                    owners={owners}
                    existingEmails={new Set(currentSquad.members.map((m) => m.email))}
                    onAdd={(m) => addToSquad(currentSquad.id, m)}
                    placeholder={`Buscar farmer para ${currentSquad.label}...`}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
