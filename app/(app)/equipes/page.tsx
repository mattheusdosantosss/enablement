import { Redis } from "@upstash/redis";
import { getTeamConfig } from "@/lib/config";
import type { FeedbackEntry } from "@/app/api/feedback/route";
import EquipesView, { type MemberStats } from "@/components/EquipesView";
import Link from "next/link";

export const dynamic = "force-dynamic";

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
  const map: Record<string, number> = {
    "30 min": 30, "45 min": 45, "1h": 60, "1h30": 90, "2h": 120,
  };
  return c ? (map[c] ?? 0) : 0;
}

const TABS = [
  { key: "b2b",     label: "Closers B2B",  teamLabel: "B2B"     },
  { key: "b2c",     label: "Closers B2C",  teamLabel: "B2C"     },
  { key: "farmers", label: "Farmers",      teamLabel: "Farmers" },
];

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

  const rawMembers: { name: string; email: string }[] =
    time === "b2b"
      ? config.b2b
      : time === "b2c"
      ? config.b2c
      : config.farmerSquads.flatMap((s) => s.members);

  const teamFeedbacks = allFeedbacks.filter(
    (f) => f.team.toLowerCase() === activeTab.teamLabel.toLowerCase()
  );

  // Agrega feedbacks por membro
  const statsMap = new Map<string, {
    count: number; totalMin: number; gestao: string | null; tipoRecente: string | null;
    objetivo: string | null; lastSentAt: string | null; allObjetivos: string[];
    notas: number[]; feedbacks: FeedbackEntry[];
  }>();

  for (const f of teamFeedbacks) {
    const key = (f.memberEmail || f.memberName).toLowerCase();
    const e = statsMap.get(key) ?? {
      count: 0, totalMin: 0, gestao: null, tipoRecente: null,
      objetivo: null, lastSentAt: null, allObjetivos: [], notas: [], feedbacks: [],
    };
    e.count++;
    e.totalMin += cargaMin(f.carga);
    e.feedbacks.push(f);
    if (f.nota != null) e.notas.push(f.nota);
    if (!e.lastSentAt || f.sentAt > e.lastSentAt) {
      e.lastSentAt = f.sentAt;
      e.gestao = f.gestao;
      e.tipoRecente = f.tipo ?? null;
    }
    if (f.objetivo && !e.allObjetivos.includes(f.objetivo)) {
      e.allObjetivos.push(f.objetivo);
    }
    statsMap.set(key, e);
  }

  const members: MemberStats[] = rawMembers.map((m) => {
    const s =
      statsMap.get(m.email.toLowerCase()) ??
      statsMap.get(m.name.toLowerCase()) ?? {
        count: 0, totalMin: 0, gestao: null, tipoRecente: null,
        objetivo: null, lastSentAt: null, allObjetivos: [], notas: [], feedbacks: [],
      };
    const notaMedia = s.notas.length > 0
      ? s.notas.reduce((a, b) => a + b, 0) / s.notas.length
      : null;
    return {
      name: m.name,
      email: m.email,
      team: activeTab.teamLabel,
      count: s.count,
      totalMin: s.totalMin,
      gestao: s.gestao,
      allObjetivos: s.allObjetivos,
      tipoRecente: s.tipoRecente,
      notaMedia,
      feedbacks: s.feedbacks,
    };
  });

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "var(--font-psa), var(--font-sans)", fontSize: 22, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", margin: 0 }}>
          Equipes
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
          Histórico de feedbacks e mentorias por membro
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

      {rawMembers.length === 0 ? (
        <div className="card">
          <div className="empty">
            Nenhum membro configurado. Adicione membros em <strong>Configurações</strong>.
          </div>
        </div>
      ) : (
        <EquipesView members={members} />
      )}
    </div>
  );
}
