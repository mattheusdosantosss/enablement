import { hsPost, hsPostAll } from "./client";
import { getOwners, ownerName, type Owner } from "./owners";
import { getTeamConfig } from "@/lib/config";
import type { ProfRow } from "@/components/ProfessionalTable";

const PIPELINE_B2B         = process.env.HUBSPOT_PIPELINE_B2B                  ?? "";
const STAGE_NEGOTIATION    = process.env.HUBSPOT_B2B_STAGE_NEGOTIATION         ?? "";
const PROP_REVENUE_LIQUIDO = process.env.HUBSPOT_B2B_PROP_REVENUE_LIQUIDO
                           ?? process.env.HUBSPOT_B2B_PROP_REVENUE
                           ?? "amount";
const PROP_REVENUE_BRUTO   = process.env.HUBSPOT_B2B_PROP_REVENUE_BRUTO        ?? PROP_REVENUE_LIQUIDO;

// IDs das etapas "Negócio fechado" e "Ganho / Contrato assinado" do pipeline B2B
const WON_STAGE_IDS: string[] = [
  process.env.HUBSPOT_STAGE_NEGOCIO_FECHADO,
  process.env.HUBSPOT_STAGE_GANHO_CONTRATO,
].filter(Boolean) as string[];

/* ── date helpers ────────────────────────────────────────────────────────── */
// closedate no HubSpot é datetime (epoch ms UTC).
// Date.UTC() garante que o cálculo independe do timezone do servidor.
// YYYY-MM-DD NÃO funciona de forma confiável no Search API para datetime —
// o HubSpot interpreta como meia-noite UTC, cortando deals fechados durante o dia.
interface PeriodRange {
  startMs:     number;  // epoch ms — hs_timestamp de reuniões (não pode ser futuro)
  endMs:       number;  // epoch ms — agora
  dealStartMs: number;  // epoch ms — início do período para closedate
  dealEndMs:   number;  // epoch ms — fim do período para closedate (período completo)
  label:       string;
}

function periodRange(period: string): PeriodRange {
  const now = new Date();
  const y   = now.getUTCFullYear();
  const m   = now.getUTCMonth();  // 0-indexed
  const d   = now.getUTCDate();

  switch (period) {
    case "hoje": {
      const s = Date.UTC(y, m, d);
      const e = Date.UTC(y, m, d + 1) - 1;
      return { startMs: s, endMs: now.getTime(), dealStartMs: s, dealEndMs: e, label: "Hoje" };
    }
    case "mes-passado": {
      const s = Date.UTC(y, m - 1, 1);
      const e = Date.UTC(y, m, 1) - 1;
      return { startMs: s, endMs: e, dealStartMs: s, dealEndMs: e, label: "Mês Passado" };
    }
    case "trimestre": {
      const qStart = Math.floor(m / 3) * 3;
      const s = Date.UTC(y, qStart, 1);
      const e = Date.UTC(y, qStart + 3, 1) - 1;
      return { startMs: s, endMs: now.getTime(), dealStartMs: s, dealEndMs: e, label: "Este Trimestre" };
    }
    default: { // "mes"
      const s = Date.UTC(y, m, 1);
      const e = Date.UTC(y, m + 1, 1) - 1;
      return { startMs: s, endMs: now.getTime(), dealStartMs: s, dealEndMs: e, label: "Este Mês" };
    }
  }
}

/* ── main export ─────────────────────────────────────────────────────────── */
export interface B2BData {
  periodLabel: string;
  totals: { meetings: number; deals: number; revenue: number; revenueBruto: number; inNegotiation: number };
  rows: ProfRow[];
}

export async function getB2BData(opts?: { period?: string }): Promise<B2BData> {
  if (!process.env.HUBSPOT_TOKEN) return SEED_B2B;

  const { b2b: configuredTeam } = await getTeamConfig();
  if (!configuredTeam.length) return SEED_B2B;

  const { startMs, endMs, dealStartMs, dealEndMs, label: periodLabel } = periodRange(opts?.period ?? "mes");

  const allOwners = await getOwners();
  const ownerByEmail = new Map<string, Owner>(allOwners.map((o) => [o.email.toLowerCase(), o]));
  const ownerById    = new Map<string, Owner>(allOwners.map((o) => [o.id, o]));

  // Mapeia membro configurado ↔ owner HubSpot
  const memberByOwnerId = new Map<string, { name: string; email: string }>();
  const ownerIds: string[] = [];
  for (const m of configuredTeam) {
    const owner = ownerByEmail.get(m.email.toLowerCase());
    if (owner) {
      memberByOwnerId.set(owner.id, { name: ownerName(owner), email: m.email });
      ownerIds.push(owner.id);
    }
  }

  const pipelineFilter = PIPELINE_B2B
    ? [{ propertyName: "pipeline", operator: "EQ", value: PIPELINE_B2B }]
    : [];

  // Filtro de estágio: usa IDs configurados; fallback para hs_is_closed_won
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const closedStageFilter: any[] = WON_STAGE_IDS.length > 0
    ? [{ propertyName: "dealstage", operator: "IN", values: WON_STAGE_IDS }]
    : [{ propertyName: "hs_is_closed_won", operator: "EQ", value: "true" }];

  // Query bulk de negócios — sem filtro por owner, agrega depois.
  // Isso evita que membros sem correspondência exata de e-mail sumam dos resultados.
  const [allDeals, allMeetings, negDeals] = await Promise.all([
    hsPostAll(
      "/crm/v3/objects/deals/search",
      {
        filterGroups: [{
          filters: [
            ...pipelineFilter,
            ...closedStageFilter,
            { propertyName: "closedate", operator: "GTE", value: String(dealStartMs) },
            { propertyName: "closedate", operator: "LTE", value: String(dealEndMs)   },
          ],
        }],
        properties: [PROP_REVENUE_LIQUIDO, PROP_REVENUE_BRUTO, "hubspot_owner_id", "dealname"],
        limit: 100,
      }
    ).catch(() => []),

    // Reuniões: usa IN para todos os owners de uma vez
    ownerIds.length > 0
      ? hsPost<{ results: { properties: Record<string, string> }[] }>(
          "/crm/v3/objects/meetings/search",
          {
            filterGroups: [{
              filters: [
                { propertyName: "hubspot_owner_id",   operator: "IN",  values: ownerIds     },
                { propertyName: "hs_meeting_outcome", operator: "EQ",  value: "COMPLETED"   },
                { propertyName: "hs_timestamp",       operator: "GTE", value: String(startMs) },
                { propertyName: "hs_timestamp",       operator: "LTE", value: String(endMs)   },
              ],
            }],
            properties: ["hs_meeting_outcome", "hubspot_owner_id"],
            limit: 200,
          }
        ).catch(() => ({ results: [] }))
      : Promise.resolve({ results: [] }),

    // Em negociação (snapshot) — também bulk
    STAGE_NEGOTIATION && ownerIds.length > 0
      ? hsPost<{ results: { properties: Record<string, string> }[] }>(
          "/crm/v3/objects/deals/search",
          {
            filterGroups: [{
              filters: [
                ...pipelineFilter,
                { propertyName: "hubspot_owner_id", operator: "IN", values: ownerIds        },
                { propertyName: "dealstage",        operator: "EQ", value: STAGE_NEGOTIATION },
              ],
            }],
            properties: ["hubspot_owner_id"],
            limit: 200,
          }
        ).catch(() => ({ results: [] }))
      : Promise.resolve({ results: [] }),
  ]);

  // Agrega por owner ID
  const dealsByOwner = new Map<string, { deals: number; revenue: number; revenueBruto: number }>();
  for (const d of allDeals) {
    const oid = d.properties["hubspot_owner_id"];
    if (!oid) continue;
    const cur = dealsByOwner.get(oid) ?? { deals: 0, revenue: 0, revenueBruto: 0 };
    cur.deals++;
    cur.revenue      += Number(d.properties[PROP_REVENUE_LIQUIDO] ?? 0);
    cur.revenueBruto += Number(d.properties[PROP_REVENUE_BRUTO]   ?? 0);
    dealsByOwner.set(oid, cur);
  }

  const meetingsByOwner = new Map<string, number>();
  for (const m of allMeetings.results) {
    const oid = m.properties["hubspot_owner_id"];
    if (!oid) continue;
    meetingsByOwner.set(oid, (meetingsByOwner.get(oid) ?? 0) + 1);
  }

  const negByOwner = new Map<string, number>();
  for (const d of negDeals.results) {
    const oid = d.properties["hubspot_owner_id"];
    if (!oid) continue;
    negByOwner.set(oid, (negByOwner.get(oid) ?? 0) + 1);
  }

  // Apenas membros configurados em Equipes → B2B; owners fora da config são ignorados
  const rows: ProfRow[] = configuredTeam.map((member) => {
    const owner   = ownerByEmail.get(member.email.toLowerCase());
    const ownerId = owner?.id;
    const deals   = ownerId ? (dealsByOwner.get(ownerId) ?? { deals: 0, revenue: 0, revenueBruto: 0 }) : { deals: 0, revenue: 0, revenueBruto: 0 };
    return {
      id:            ownerId ?? member.email,
      name:          owner ? ownerName(owner) : member.name,
      email:         member.email,
      meetings:      ownerId ? (meetingsByOwner.get(ownerId) ?? 0) : 0,
      deals:         deals.deals,
      revenue:       deals.revenue,
      revenueBruto:  deals.revenueBruto,
      inNegotiation: ownerId ? (negByOwner.get(ownerId) ?? 0) : 0,
    };
  });

  rows.sort((a, b) => (b.deals ?? 0) - (a.deals ?? 0));

  return {
    periodLabel,
    totals: {
      deals:         rows.reduce((s, r) => s + (r.deals         ?? 0), 0),
      revenue:       rows.reduce((s, r) => s + (r.revenue       ?? 0), 0),
      revenueBruto:  rows.reduce((s, r) => s + (r.revenueBruto  ?? 0), 0),
      meetings:      rows.reduce((s, r) => s + (r.meetings      ?? 0), 0),
      inNegotiation: rows.reduce((s, r) => s + (r.inNegotiation ?? 0), 0),
    },
    rows,
  };
}

const SEED_B2B: B2BData = {
  periodLabel: "Este Mês",
  totals: { meetings: 42, deals: 18, revenue: 287500, revenueBruto: 312000, inNegotiation: 9 },
  rows: [
    { id: "1", name: "Carlos Mendes",  email: "carlos@psa.com", meetings: 14, deals: 7, revenue: 112000, revenueBruto: 125000, inNegotiation: 3 },
    { id: "2", name: "Ana Beatriz",    email: "ana@psa.com",    meetings: 16, deals: 6, revenue:  98500, revenueBruto: 107000, inNegotiation: 4 },
    { id: "3", name: "Rafael Lima",    email: "rafael@psa.com", meetings: 12, deals: 5, revenue:  77000, revenueBruto:  80000, inNegotiation: 2 },
  ],
};
