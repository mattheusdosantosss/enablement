import { hsPost } from "./client";
import { ownerMap, ownerName } from "./owners";
import type { ProfRow } from "@/components/ProfessionalTable";

const PIPELINE_B2B = process.env.HUBSPOT_PIPELINE_B2B ?? "";
const STAGE_NEGOTIATION = process.env.HUBSPOT_B2B_STAGE_NEGOTIATION ?? "";
const PROP_REVENUE = process.env.HUBSPOT_B2B_PROP_REVENUE ?? "amount";

function monthRange(mes?: string) {
  let year: number, month: number;
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    [year, month] = mes.split("-").map(Number);
    month -= 1;
  } else {
    const n = new Date(); year = n.getFullYear(); month = n.getMonth();
  }
  const now = new Date();
  const isCurrent = year === now.getFullYear() && month === now.getMonth();
  const start = new Date(year, month, 1).getTime();
  const end   = isCurrent ? Date.now() : new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
  return { start, end };
}

export interface B2BData {
  totals: { meetings: number; deals: number; revenue: number; inNegotiation: number };
  rows: ProfRow[];
}

export async function getB2BData(opts?: { mes?: string }): Promise<B2BData> {
  if (!process.env.HUBSPOT_TOKEN || !PIPELINE_B2B) return SEED_B2B;

  const { start, end } = monthRange(opts?.mes);
  const owners = await ownerMap();

  // Closed-won deals this month
  const dealsRes = await hsPost<{ results: any[]; paging?: any }>(
    "/crm/v3/objects/deals/search",
    {
      filterGroups: [
        {
          filters: [
            { propertyName: "pipeline", operator: "EQ", value: PIPELINE_B2B },
            { propertyName: "dealstage", operator: "EQ", value: "closedwon" },
            { propertyName: "closedate", operator: "GTE", value: String(start) },
            { propertyName: "closedate", operator: "LTE", value: String(end) },
          ],
        },
      ],
      properties: ["hubspot_owner_id", PROP_REVENUE, "dealname"],
      limit: 200,
    }
  );

  // Deals in negotiation stage (no date filter)
  const negRes = await hsPost<{ results: any[] }>(
    "/crm/v3/objects/deals/search",
    {
      filterGroups: [
        {
          filters: [
            { propertyName: "pipeline", operator: "EQ", value: PIPELINE_B2B },
            { propertyName: "dealstage", operator: "EQ", value: STAGE_NEGOTIATION },
          ],
        },
      ],
      properties: ["hubspot_owner_id"],
      limit: 200,
    }
  );

  // Meetings this month
  const meetRes = await hsPost<{ results: any[] }>(
    "/crm/v3/objects/meetings/search",
    {
      filterGroups: [
        {
          filters: [
            { propertyName: "hs_meeting_outcome", operator: "EQ", value: "COMPLETED" },
            { propertyName: "hs_timestamp", operator: "GTE", value: String(start) },
            { propertyName: "hs_timestamp", operator: "LTE", value: String(end) },
          ],
        },
      ],
      properties: ["hubspot_owner_id", "hs_meeting_outcome"],
      limit: 200,
    }
  );

  // Aggregate by owner
  const byOwner = new Map<string, ProfRow>();

  const ensure = (ownerId: string) => {
    if (!byOwner.has(ownerId)) {
      const o = owners.get(ownerId);
      byOwner.set(ownerId, {
        id: ownerId,
        name: o ? ownerName(o) : `Owner ${ownerId}`,
        email: o?.email ?? "",
        meetings: 0,
        deals: 0,
        revenue: 0,
        inNegotiation: 0,
      });
    }
    return byOwner.get(ownerId)!;
  };

  for (const d of dealsRes.results) {
    const oid = d.properties.hubspot_owner_id;
    if (!oid) continue;
    const row = ensure(oid);
    row.deals = (row.deals ?? 0) + 1;
    row.revenue = (row.revenue ?? 0) + Number(d.properties[PROP_REVENUE] ?? 0);
  }

  for (const d of negRes.results) {
    const oid = d.properties.hubspot_owner_id;
    if (!oid) continue;
    const row = ensure(oid);
    row.inNegotiation = (row.inNegotiation ?? 0) + 1;
  }

  for (const m of meetRes.results) {
    const oid = m.properties.hubspot_owner_id;
    if (!oid) continue;
    const row = ensure(oid);
    row.meetings = (row.meetings ?? 0) + 1;
  }

  const rows = Array.from(byOwner.values()).sort((a, b) => (b.deals ?? 0) - (a.deals ?? 0));

  return {
    totals: {
      deals: rows.reduce((s, r) => s + (r.deals ?? 0), 0),
      revenue: rows.reduce((s, r) => s + (r.revenue ?? 0), 0),
      meetings: rows.reduce((s, r) => s + (r.meetings ?? 0), 0),
      inNegotiation: rows.reduce((s, r) => s + (r.inNegotiation ?? 0), 0),
    },
    rows,
  };
}

const SEED_B2B: B2BData = {
  totals: { meetings: 42, deals: 18, revenue: 287500, inNegotiation: 9 },
  rows: [
    { id: "1", name: "Carlos Mendes", email: "carlos@psa.com", meetings: 14, deals: 7, revenue: 112000, inNegotiation: 3 },
    { id: "2", name: "Ana Beatriz", email: "ana@psa.com", meetings: 16, deals: 6, revenue: 98500, inNegotiation: 4 },
    { id: "3", name: "Rafael Lima", email: "rafael@psa.com", meetings: 12, deals: 5, revenue: 77000, inNegotiation: 2 },
  ],
};
