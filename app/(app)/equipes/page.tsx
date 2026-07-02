import { Redis } from "@upstash/redis";
import { getTeamConfig } from "@/lib/config";
import type { FeedbackEntry } from "@/app/api/feedback/route";
import Link from "next/link";

export const dynamic = "force-dynamic";

// ── Helpers ────────────────────────────────────────────────────────────────────

function getRedis(): Redis | null {
  const url   = process.env.KV_REST_API_URL   ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

async function getFeedbacks(): Promise<FeedbackEntry[]> {
  try {
    const redis = getRedis();
    if (!redis) return [];
    const raw = await redis.lrange("psa:feedback_history", 0, 99);
    return (raw as (string | FeedbackEntry)[]).map((r) =>
      typeof r === "string" ? JSON.parse(r) : r
    ) as FeedbackEntry[];
  } catch { return []; }
}

function cargaMin(c: string | null): number {
  if (!c) return 0;
  const map: Record<string, number> = {
    "30 min": 30, "45 min": 45, "1h": 60, "1h30": 90, "2h": 120,
  };
  return map[c] ?? 0;
}

function fmtMin(m: number): string {
  if (m === 0) return "—";
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h === 0) return `${min}min`;
  if (min === 0) return `${h}h`;
  return `${h}h ${min}min`;
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
}

const TABS = [
  { key: "b2b",     label: "Closers B2B",  teamLabel: "B2B"     },
  { key: "b2c",     label: "Closers B2C",  teamLabel: "B2C"     },
  { key: "farmers", label: "Farmers",      teamLabel: "Farmers" },
];

// ── Page ───────────────────────────────────────────────────────────────────────
export default async function EquipesPage({
  searchParams,
}: {
  searchParams: { time?: string };
}) {
  const time = (searchParams.time ?? "b2b") as "b2b" | "b2c" | "farmers";
  const activeTab = TABS.find((t) => t.key === time) ?? TABS[0];

  const [config, allFeedbacks] = await Promise.all([
    getTeamConfig(),
    getFeedbacks(),
  ]);

  // Monta lista de membros do tab ativo
  const members: { name: string; email: string }[] =
    time === "b2b"
      ? config.b2b
      : time === "b2c"
      ? config.b2c
      : config.farmerSquads.flatMap((s) => s.members);

  // Feedbacks deste time
  const teamFeedbacks = allFeedbacks.filter(
    (f) => f.team.toLowerCase() === activeTab.teamLabel.toLowerCase()
  );

  // Agrega por membro (match por email, fallback por nome)
  interface Stats {
    count: number;
    totalMin: number;
    gestao: string | null;
    objetivo: string | null;
    lastSentAt: string | null;
    allObjetivos: string[];
  }

  const statsByEmail = new Map<string, Stats>();

  for (const f of teamFeedbacks) {
    const key = (f.memberEmail || f.memberName).toLowerCase();
    const existing = statsByEmail.get(key) ?? {
      count: 0, totalMin: 0, gestao: null, objetivo: null, lastSentAt: null, allObjetivos: [],
    };
    existing.count++;
    existing.totalMin += cargaMin(f.carga);
    // Mantém info do mais recente
    if (!existing.lastSentAt || f.sentAt > existing.lastSentAt) {
      existing.lastSentAt = f.sentAt;
      existing.gestao = f.gestao;
      existing.objetivo = f.objetivo;
    }
    if (f.objetivo && !existing.allObjetivos.includes(f.objetivo)) {
      existing.allObjetivos.push(f.objetivo);
    }
    statsByEmail.set(key, existing);
  }

  function statsFor(m: { name: string; email: string }): Stats {
    return (
      statsByEmail.get(m.email.toLowerCase()) ??
      statsByEmail.get(m.name.toLowerCase()) ?? {
        count: 0, totalMin: 0, gestao: null, objetivo: null, lastSentAt: null, allObjetivos: [],
      }
    );
  }

  const totalFeedbacks = members.reduce((s, m) => s + statsFor(m).count, 0);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "var(--font-psa), var(--font-sans)", fontSize: 22, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", margin: 0 }}>
          Equipes
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
          Historico de feedbacks e mentorias por membro
        </p>
      </div>

      {/* Tabs */}
      <div className="seg" style={{ marginBottom: 28 }}>
        {TABS.map((tab) => (
          <Link key={tab.key} href={`/equipes?time=${tab.key}`}
            className={`seg-item${time === tab.key ? " active" : ""}`}>
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Resumo do time */}
      <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 28, padding: "14px 20px", background: "var(--s2)", borderRadius: 12, border: "1px solid var(--border)" }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>Membros</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", fontFamily: "var(--font-psa), var(--font-mono)" }}>{members.length}</div>
        </div>
        <div style={{ width: 1, height: 36, background: "var(--border)" }} />
        <div>
          <div style={{ fontSize: 11, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>Total de feedbacks</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--orange)", fontFamily: "var(--font-psa), var(--font-mono)" }}>{totalFeedbacks}</div>
        </div>
        <div style={{ width: 1, height: 36, background: "var(--border)" }} />
        <div>
          <div style={{ fontSize: 11, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>Carga total</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--blue)", fontFamily: "var(--font-psa), var(--font-mono)" }}>
            {fmtMin(members.reduce((s, m) => s + statsFor(m).totalMin, 0))}
          </div>
        </div>
      </div>

      {/* Cards de membros */}
      {members.length === 0 ? (
        <div className="card">
          <div className="empty">Nenhum membro configurado. Adicione membros em <strong>Configurações</strong>.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {members.map((m) => {
            const s = statsFor(m);
            const hasFeedback = s.count > 0;
            return (
              <div key={m.email} className="card" style={{ padding: "20px 22px" }}>
                {/* Avatar + nome */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                  <div className="av" style={{ width: 42, height: 42, fontSize: 13, flexShrink: 0 }}>
                    {initials(m.name)}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", lineHeight: 1.3 }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>{activeTab.teamLabel}</div>
                  </div>
                </div>

                {/* Separador */}
                <div style={{ height: 1, background: "var(--border-soft)", marginBottom: 16 }} />

                {/* Métricas */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <Row label="Feedbacks realizados"
                    value={hasFeedback ? String(s.count) : "0"}
                    accent={hasFeedback}
                  />
                  <Row label="Mentoria técnica" value={fmtMin(s.totalMin)} />
                  {s.gestao && <Row label="Gestão" value={s.gestao} />}
                  {s.allObjetivos.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {s.allObjetivos.length === 1 ? "Tag" : "Tags"}
                      </span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {s.allObjetivos.map((tag) => (
                          <span key={tag} style={{
                            fontSize: 11, fontWeight: 600, padding: "3px 10px",
                            background: "rgba(255,106,26,0.12)", color: "var(--orange)",
                            borderRadius: 20, border: "1px solid rgba(255,106,26,0.25)",
                          }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Estado sem feedback */}
                {!hasFeedback && (
                  <div style={{ marginTop: 14, fontSize: 11, color: "var(--faint)", fontStyle: "italic" }}>
                    Nenhum feedback registrado ainda.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: accent ? "var(--orange)" : "var(--text)", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
    </div>
  );
}
