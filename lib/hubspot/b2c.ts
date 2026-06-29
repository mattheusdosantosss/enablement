import { hsPost, hs } from "./client";
import { B2C_TEAM } from "@/lib/teams";
import type { ProfRow } from "@/components/ProfessionalTable";

const PROP_REVENUE = process.env.HUBSPOT_B2C_PROP_REVENUE ?? "amount";
const PROP_PRODUCT = process.env.HUBSPOT_B2C_PROP_PRODUCT ?? "dealname";

function monthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start: start.getTime(), end: Date.now() };
}

export interface B2CData {
  totals: { deals: number; revenue: number; meetings: number; products: number };
  rows: ProfRow[];
}

async function resolveOwnerIds(emails: string[]): Promise<Map<string, string>> {
  // GET /crm/v3/owners returns all owners; match by email
  const data = await hs<{ results: { id: string; email: string; firstName: string; lastName: string }[] }>(
    "/crm/v3/owners?limit=200"
  );
  const map = new Map<string, string>(); // email → ownerId
  for (const o of data.results) {
    if (emails.includes(o.email)) map.set(o.email, o.id);
  }
  return map;
}

export async function getB2CData(): Promise<B2CData> {
  if (!process.env.HUBSPOT_TOKEN) return SEED_B2C;

  const emails = B2C_TEAM.map((m) => m.email);
  const emailToOwner = await resolveOwnerIds(emails);

  const { start, end } = monthRange();

  // Build per-member rows
  const rows: ProfRow[] = [];

  for (const member of B2C_TEAM) {
    const ownerId = emailToOwner.get(member.email);

    const row: ProfRow = {
      id: ownerId ?? member.email,
      name: member.name,
      email: member.email,
      deals: 0,
      revenue: 0,
      meetings: 0,
      products: [],
    };

    if (!ownerId) {
      rows.push(row);
      continue;
    }

    // Closed-won deals this month
    const dealsRes = await hsPost<{ results: { properties: Record<string, string> }[] }>(
      "/crm/v3/objects/deals/search",
      {
        filterGroups: [
          {
            filters: [
              { propertyName: "hubspot_owner_id", operator: "EQ", value: ownerId },
              { propertyName: "dealstage", operator: "EQ", value: "closedwon" },
              { propertyName: "closedate", operator: "GTE", value: String(start) },
              { propertyName: "closedate", operator: "LTE", value: String(end) },
            ],
          },
        ],
        properties: [PROP_REVENUE, PROP_PRODUCT],
        limit: 200,
      }
    );

    const productSet = new Set<string>();
    for (const d of dealsRes.results) {
      row.deals = (row.deals ?? 0) + 1;
      row.revenue = (row.revenue ?? 0) + Number(d.properties[PROP_REVENUE] ?? 0);
      const prod = d.properties[PROP_PRODUCT];
      if (prod) productSet.add(prod);
    }
    row.products = Array.from(productSet);

    // Meetings this month
    const meetRes = await hsPost<{ results: unknown[] }>(
      "/crm/v3/objects/meetings/search",
      {
        filterGroups: [
          {
            filters: [
              { propertyName: "hubspot_owner_id", operator: "EQ", value: ownerId },
              { propertyName: "hs_timestamp", operator: "GTE", value: String(start) },
              { propertyName: "hs_timestamp", operator: "LTE", value: String(end) },
            ],
          },
        ],
        properties: ["hs_meeting_outcome"],
        limit: 200,
      }
    );

    row.meetings = meetRes.results.length;
    rows.push(row);
  }

  rows.sort((a, b) => (b.deals ?? 0) - (a.deals ?? 0));

  const allProducts = new Set(rows.flatMap((r) => r.products ?? []));

  return {
    totals: {
      deals: rows.reduce((s, r) => s + (r.deals ?? 0), 0),
      revenue: rows.reduce((s, r) => s + (r.revenue ?? 0), 0),
      meetings: rows.reduce((s, r) => s + (r.meetings ?? 0), 0),
      products: allProducts.size,
    },
    rows,
  };
}

const SEED_B2C: B2CData = {
  totals: { deals: 31, revenue: 156000, meetings: 54, products: 4 },
  rows: B2C_TEAM.map((m, i) => ({
    id: String(i + 1),
    name: m.name,
    email: m.email,
    deals: [11, 10, 5, 3, 1, 1][i] ?? 0,
    revenue: [55000, 52000, 25000, 15000, 5000, 4000][i] ?? 0,
    meetings: [19, 18, 8, 5, 2, 2][i] ?? 0,
    products: [],
  })),
};
