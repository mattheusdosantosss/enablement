import { hsPost } from "./client";
import { getOwners, ownerName, type Owner } from "./owners";
import { getTeamConfig } from "@/lib/config";
import type { ProfRow } from "@/components/ProfessionalTable";

const PIPELINE_B2B         = process.env.HUBSPOT_PIPELINE_B2B                  ?? "";
const STAGE_NEGOTIATION    = process.env.HUBSPOT_B2B_STAGE_NEGOTIATION         ?? "";
const PROP_REVENUE_LIQUIDO = process.env.HUBSPOT_B2B_PROP_REVENUE_LIQUIDO
                           ?? process.env.HUBSPOT_B2B_PROP_REVENUE
                           ?? "amount";
const PROP_REVENUE_BRUTO   = process.env.HUBSPOT_B2B_PROP_REVENUE_BRUTO        ?? PROP_REVENUE_LIQUIDO;

const pad = (n: number) => String(n).padStart(2, "0");
const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

interface PeriodRange {
  startMs:   number;   // para hs_timestamp em reuniões
  endMs:     number;
  startDate: string;   // YYYY-MM-DD para closedate (evita problema de timezone UTC vs BRT)
  endDate:   string;
  label:     string;
}

function periodRange(period: string): PeriodRange {
  const now   = new Date();
  const today = toDateStr(now);

  switch (period) {
    case "hoje": {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { startMs: startOfDay.getTime(), endMs: now.getTime(), startDate: today, endDate: today, label: "Hoje" };
    }
    case "mes-passado": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last  = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        startMs: first.getTime(),
        endMs:   new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime(),
        startDate: toDateStr(first), endDate: toDateStr(last),
        label: "Mês Passado",
      };
    }
    case "trimestre": {
      const first = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      return { startMs: first.getTime(), endMs: now.getTime(), startDate: toDateStr(first), endDate: today, label: "Este Trimestre" };
    }
    case "mes":
    default: {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startMs: first.getTime(), endMs: now.getTime(), startDate: toDateStr(first), endDate: today, label: "Este Mês" };
    }
  }
}

export interface B2BData {
  periodLabel: string;
  totals: { meetings: number; deals: number; revenue: number; revenueBruto: number; inNegotiation: number };
  rows: ProfRow[];
}

export async function getB2BData(opts?: { period?: string }): Promise<B2BData> {
  if (!process.env.HUBSPOT_TOKEN) return SEED_B2B;

  const { b2b: configuredTeam } = await getTeamConfig();
  if (!configuredTeam.length) return SEED_B2B;

  const { startMs, endMs, startDate, endDate, label: periodLabel } = periodRange(opts?.period ?? "mes");

  const allOwners = await getOwners();
  const ownerByEmail = new Map<string, Owner>(
    allOwners.map((o) => [o.email.toLowerCase(), o])
  );

  const pipelineFilter = PIPELINE_B2B
    ? [{ propertyName: "pipeline", operator: "EQ", value: PIPELINE_B2B }]
    : [];

  const rows: ProfRow[] = await Promise.all(
    configuredTeam.map(async (member) => {
      const owner = ownerByEmail.get(member.email.toLowerCase());
      const row: ProfRow = {
        id: owner?.id ?? member.email,
        name: owner ? ownerName(owner) : member.name,
        email: member.email,
        meetings: 0, deals: 0, revenue: 0, revenueBruto: 0, inNegotiation: 0,
      };

      if (!owner) return row;

      const [dealsRes, negRes, meetRes] = await Promise.all([
        // Negócios fechados no período
        // Usa hs_is_closed_won=true em vez de dealstage=closedwon para funcionar
        // com estágios customizados do pipeline B2B (não só o padrão closedwon).
        // Usa datas YYYY-MM-DD para closedate para evitar divergência UTC/BRT.
        hsPost<{ results: { properties: Record<string, string> }[] }>(
          "/crm/v3/objects/deals/search",
          {
            filterGroups: [{
              filters: [
                ...pipelineFilter,
                { propertyName: "hubspot_owner_id",  operator: "EQ",  value: owner.id     },
                { propertyName: "hs_is_closed_won",  operator: "EQ",  value: "true"       },
                { propertyName: "closedate",         operator: "GTE", value: startDate    },
                { propertyName: "closedate",         operator: "LTE", value: endDate      },
              ],
            }],
            properties: [PROP_REVENUE_LIQUIDO, PROP_REVENUE_BRUTO, "dealname"],
            limit: 200,
          }
        ).catch(() => ({ results: [] })),

        // Em negociação (snapshot)
        STAGE_NEGOTIATION
          ? hsPost<{ results: unknown[] }>(
              "/crm/v3/objects/deals/search",
              {
                filterGroups: [{
                  filters: [
                    ...pipelineFilter,
                    { propertyName: "hubspot_owner_id", operator: "EQ", value: owner.id          },
                    { propertyName: "dealstage",        operator: "EQ", value: STAGE_NEGOTIATION },
                  ],
                }],
                properties: ["hubspot_owner_id"],
                limit: 200,
              }
            ).catch(() => ({ results: [] }))
          : Promise.resolve({ results: [] }),

        // Reuniões realizadas no período
        hsPost<{ results: unknown[] }>(
          "/crm/v3/objects/meetings/search",
          {
            filterGroups: [{
              filters: [
                { propertyName: "hubspot_owner_id",   operator: "EQ",  value: owner.id       },
                { propertyName: "hs_meeting_outcome", operator: "EQ",  value: "COMPLETED"    },
                { propertyName: "hs_timestamp",       operator: "GTE", value: String(startMs) },
                { propertyName: "hs_timestamp",       operator: "LTE", value: String(endMs)   },
              ],
            }],
            properties: ["hs_meeting_outcome"],
            limit: 200,
          }
        ).catch(() => ({ results: [] })),
      ]);

      for (const d of dealsRes.results) {
        row.deals        = (row.deals        ?? 0) + 1;
        row.revenue      = (row.revenue      ?? 0) + Number(d.properties[PROP_REVENUE_LIQUIDO] ?? 0);
        row.revenueBruto = (row.revenueBruto ?? 0) + Number(d.properties[PROP_REVENUE_BRUTO]   ?? 0);
      }
      row.inNegotiation = negRes.results.length;
      row.meetings      = meetRes.results.length;

      return row;
    })
  );

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
