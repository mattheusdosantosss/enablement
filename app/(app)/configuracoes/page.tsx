"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

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
  ownersLoading,
  ownersError,
  existingEmails,
  onAdd,
  placeholder,
}: {
  owners: HsOwner[];
  ownersLoading: boolean;
  ownersError: boolean;
  existingEmails: Set<string>;
  onAdd: (m: Member) => void;
  placeholder?: string;
}) {
  const [query,    setQuery]    = useState("");
  const [focused,  setFocused]  = useState(false);
  const [selected, setSelected] = useState<HsOwner | null>(null);
  const [dropPos,  setDropPos]  = useState<{ top: number; left: number; width: number } | null>(null);
  const [mounted,  setMounted]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const available = owners.filter((o) => !existingEmails.has(o.email));
  const filtered  = query.length > 0
    ? available.filter((o) =>
        o.name.toLowerCase().includes(query.toLowerCase()) ||
        o.email.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10)
    : available.slice(0, 10);

  const showDropdown = focused && !ownersLoading && (query.length > 0 || available.length > 0);
  const noResults    = query.length > 0 && filtered.length === 0;

  function openDropdown() {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setFocused(true);
  }

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

  const inputPlaceholder = ownersLoading
    ? "Carregando colaboradores do HubSpot..."
    : ownersError
    ? "Erro ao carregar HubSpot - verifique o token"
    : (placeholder ?? "Buscar por nome ou e-mail...");

  return (
    <form onSubmit={submit} style={{ padding: "12px 14px", background: "var(--s2)", borderTop: "1px solid var(--border-soft)" }}>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <input
            ref={inputRef}
            className="finp"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
            onFocus={openDropdown}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder={inputPlaceholder}
            disabled={ownersLoading || ownersError}
            style={{ width: "100%", fontSize: 13, padding: "9px 12px" }}
            autoComplete="off"
          />
        </div>

        <button
          type="submit"
          disabled={!selected}
          className="btn"
          style={{ opacity: selected ? 1 : 0.35, cursor: selected ? "pointer" : "not-allowed", padding: "9px 18px", fontSize: 12 }}
        >
          + Adicionar
        </button>
      </div>

      {ownersError && (
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--red)" }}>
          Nao foi possivel carregar os colaboradores do HubSpot. Verifique se o token esta correto.
        </div>
      )}

      {/* Portal: renderiza fora de qualquer overflow:hidden ou backdrop-filter */}
      {mounted && showDropdown && dropPos && createPortal(
        <div style={{
          position: "fixed",
          top: dropPos.top,
          left: dropPos.left,
          width: dropPos.width,
          zIndex: 9999,
          background: "var(--s1)", border: "1px solid var(--border)",
          borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.75)",
          maxHeight: 280, overflowY: "auto",
        }}>
          {noResults ? (
            <div style={{ padding: "14px 16px", fontSize: 12, color: "var(--text-3)", textAlign: "center" }}>
              Nenhum resultado para <strong style={{ color: "var(--text-2)" }}>{query}</strong>
            </div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.email}
                type="button"
                onMouseDown={() => pick(o)}
                style={{
                  width: "100%", textAlign: "left", background: "none", border: "none",
                  padding: "10px 14px", cursor: "pointer", display: "flex", gap: 11,
                  alignItems: "center", borderBottom: "1px solid var(--border-soft)",
                  transition: "background .1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--s2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <span className="av" style={{ width: 28, height: 28, fontSize: 10, flexShrink: 0 }}>{initials(o.name)}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{o.email}</div>
                </div>
              </button>
            ))
          )}
        </div>,
        document.body
      )}
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
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, padding: "10px 14px", borderBottom: "1px solid var(--border-soft)",
        background: "rgba(255,69,58,0.06)",
      }}>
        <div style={{ fontSize: 13, color: "var(--text-2)" }}>
          Remover <strong style={{ color: "var(--text)" }}>{member.name}</strong>?
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => setConfirming(false)}
            style={{
              background: "var(--s3)", border: "1px solid var(--border)", color: "var(--text-2)",
              borderRadius: 7, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => { setConfirming(false); onRemove(); }}
            style={{
              background: "var(--red)", border: "none", color: "#fff",
              borderRadius: 7, padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >
            Remover
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderBottom: "1px solid var(--border-soft)" }}>
      <span className="av">{initials(member.name)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{member.name}</div>
        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{member.email}</div>
      </div>
      {squadOptions && onMove && (
        <select
          value={currentSquad ?? ""}
          onChange={(e) => onMove(e.target.value)}
          style={{
            background: "var(--s2)", border: "1px solid var(--border)", color: "var(--text-2)",
            borderRadius: 7, padding: "5px 10px", fontSize: 11, outline: "none", cursor: "pointer",
          }}
        >
          {squadOptions.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      )}
      <button
        onClick={() => setConfirming(true)}
        title="Remover membro"
        style={{
          background: "none", border: "1px solid var(--border)", color: "var(--text-3)", borderRadius: 7,
          width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", fontSize: 14, flexShrink: 0, transition: "all .15s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--red)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--red)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)"; }}
      >
        &times;
      </button>
    </div>
  );
}

/* ── TabBtn / SquadTabBtn — usam .seg-item do globals.css ── */
function TabBtn({ label, active, count, onClick }: {
  label: string; active: boolean; count?: number; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`seg-item${active ? " active" : ""}`}>
      {label}
      {count !== undefined && <span className="seg-badge">{count}</span>}
    </button>
  );
}

function SquadTabBtn({ label, active, count, onClick }: {
  label: string; active: boolean; count: number; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`seg-item${active ? " active sub" : ""}`}>
      {label}
      <span className="seg-badge">{count}</span>
    </button>
  );
}

/* ── main page ───────────────────────────────────────────────────────────── */
export default function ConfiguracoesPage() {
  const [config,        setConfig]        = useState<Config | null>(null);
  const [owners,        setOwners]        = useState<HsOwner[]>([]);
  const [ownersLoading, setOwnersLoading] = useState(true);
  const [ownersError,   setOwnersError]   = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [status,        setStatus]        = useState<"idle" | "saved" | "error">("idle");
  const [tab,           setTab]           = useState<Tab>("b2b");
  const [activeSquad,   setActiveSquad]   = useState<string>("");

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
      .then((d: { owners: HsOwner[] }) => {
        setOwners(d.owners ?? []);
        setOwnersLoading(false);
      })
      .catch(() => {
        setOwnersLoading(false);
        setOwnersError(true);
      });
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
          <div className="seg">
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
              <AddOwnerForm owners={owners} ownersLoading={ownersLoading} ownersError={ownersError} existingEmails={new Set(config.b2b.map((m) => m.email))} onAdd={addB2B} />
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
              <AddOwnerForm owners={owners} ownersLoading={ownersLoading} ownersError={ownersError} existingEmails={new Set(config.b2c.map((m) => m.email))} onAdd={addB2C} />
            </div>
          )}

          {/* Farmers - sub-abas por squad */}
          {tab === "farmers" && (
            <div>
              {/* Sub-tabs squad */}
              <div className="seg" style={{ marginBottom: 20 }}>
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
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--blue)", display: "inline-block", flexShrink: 0 }} />
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
                    ownersLoading={ownersLoading}
                    ownersError={ownersError}
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
