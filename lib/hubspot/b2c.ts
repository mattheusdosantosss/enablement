import { hsPost } from "./client";
import { ownerMap, ownerName } from "./owners";
import type { ProfRow } from "@/components/ProfessionalTable";

const PIPELINE_B2C = process.env.HUBSPOT_PIPELINE_B2C ?? "";
const PROP_REVENUE = process.env.HUBSPOT_B2C_PROP_REVENUE ?? "amount";
const PROP_PRODUCT = process.env.HUBSPOT_B2C_PROP_PRODUCT ?? "line_items";

function monthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start: start.getTime(), end: Date.now() };
}

export interface B2CData {
  totals: { deals: number; revenue: number; meetings: number; products: number };
  rows: ProfRow[];
}

export async function getB2CData(): Promise<B2CData> {
  if (!process.env.HUBSPOT_TOKEN || !PIPELINE_B2C) return SEED_B2C;

  const { start, end } = monthRange();
  const owners = await ownerMap();

  const dealsRes = await hsPost<{ results: any[] }>(
    "/crm/v3/objects/deals/search",
    {
      filterGroups: [
        {
          filters: [
            { propertyName: "pipeline", operator: "EQ", value: PIPELINE_B2C },
            { propertyName: "dealstage", operator: "EQ", value: "closedwon" },
            { propertyName: "closedate", operator: "GTE", value: String(start) },
            { propertyName: "closedate", operator: "LTE", value: String(end) },
          ],
        },
      ],
      properties: ["hubspot_owner_id", PROP_REVENUE, PROP_PRODUCT],
      limit: 200,
    }
  );

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
      properties: ["hubspot_owner_id"],
      limit: 200,
    }
  );

  const byOwner = new Map<string, ProfRow & { _products: Set<string> }>();

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
        products: [],
        _products: new Set(),
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
    const prod = d.properties[PROP_PRODUCT];
    if (prod) row._products.add(prod);
  }

  for (const m of meetRes.results) {
    const oid = m.properties.hubspot_owner_id;
    if (!oid) continue;
    const row = ensure(oid);
    row.meetings = (row.meetings ?? 0) + 1;
  }

  const allProducts = new Set<string>();
  const rows: ProfRow[] = Array.from(byOwner.values()).map((r) => {
    const prods = [...r._products];
    prods.forEach((p) => allProducts.add(p));
    return { ...r, products: prods };
  });

  rows.sort((a, b) => (b.deals ?? 0) - (a.deals ?? 0));

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
  rows: [
    { id: "1", name: "Juliana Costa", email: "juliana@psa.com", deals: 11, revenue: 55000, meetings: 19, products: ["Produto A", "Produto B"] },
    { id: "2", name: "Fernanda Rocha", email: "fernanda@psa.com", deals: 10, revenue: 52000, meetings: 18, products: ["Produto A", "Produto C"] },
    { id: "3", name: "Bruno Alves", email: "bruno@psa.com", deals: 10, revenue: 49000, meetings: 17, products: ["Produto B", "Produto D"] },
  ],
};
