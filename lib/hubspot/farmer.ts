import { hsPost } from "./client";
import { ownerMap, ownerName } from "./owners";
import type { ProfRow } from "@/components/ProfessionalTable";

const PIPELINE_FARMER = process.env.HUBSPOT_PIPELINE_FARMER ?? "";
const PIPELINE_CS = process.env.HUBSPOT_PIPELINE_CS ?? "";
const STAGE_IN_PROGRESS = process.env.HUBSPOT_CS_STAGE_IN_PROGRESS ?? "";
const PROP_REVENUE = process.env.HUBSPOT_FARMER_PROP_REVENUE ?? "amount";
const PROP_ORIGIN = process.env.HUBSPOT_FARMER_PROP_ORIGIN ?? "origem_do_lead";
const ORIGIN_VALUE = process.env.HUBSPOT_FARMER_ORIGIN_VALUE ?? "Carteira do Farmer";

function monthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start: start.getTime(), end: Date.now() };
}

export interface FarmerData {
  totals: { meetings: number; inProgress: number; raised: number; converted: number };
  rows: ProfRow[];
}

export async function getFarmerData(): Promise<FarmerData> {
  if (!process.env.HUBSPOT_TOKEN) return SEED_FARMER;

  const { start, end } = monthRange();
  const owners = await ownerMap();

  // Demandas levantadas no mês (deals criados com origem farmer)
  const raisedRes = await hsPost<{ results: any[] }>(
    "/crm/v3/objects/deals/search",
    {
      filterGroups: [
        {
          filters: [
            { propertyName: "pipeline", operator: "EQ", value: PIPELINE_FARMER },
            { propertyName: PROP_ORIGIN, operator: "EQ", value: ORIGIN_VALUE },
            { propertyName: "createdate", operator: "GTE", value: String(start) },
            { propertyName: "createdate", operator: "LTE", value: String(end) },
          ],
        },
      ],
      properties: ["hubspot_owner_id", PROP_REVENUE, "dealstage"],
      limit: 200,
    }
  );

  // Tramitações em andamento (tickets CS ao vivo)
  const ticketsRes = await hsPost<{ results: any[] }>(
    "/crm/v3/objects/tickets/search",
    {
      filterGroups: [
        {
          filters: [
            { propertyName: "hs_pipeline", operator: "EQ", value: PIPELINE_CS },
            { propertyName: "hs_pipeline_stage", operator: "EQ", value: STAGE_IN_PROGRESS },
          ],
        },
      ],
      properties: ["hubspot_owner_id"],
      limit: 200,
    }
  );

  // Reuniões agendadas no mês
  const meetRes = await hsPost<{ results: any[] }>(
    "/crm/v3/objects/meetings/search",
    {
      filterGroups: [
        {
          filters: [
            { propertyName: "hs_timestamp", operator: "GTE", value: String(start) },
            { propertyName: "hs_timestamp", operator: "LTE", value: String(end) },
          ],
        },
      ],
      properties: ["hubspot_owner_id"],
      limit: 200,
    }
  );

  const byOwner = new Map<string, ProfRow>();

  const ensure = (ownerId: string) => {
    if (!byOwner.has(ownerId)) {
      const o = owners.get(ownerId);
      byOwner.set(ownerId, {
        id: ownerId,
        name: o ? ownerName(o) : `Owner ${ownerId}`,
        email: o?.email ?? "",
        meetings: 0,
        inProgress: 0,
        raised: 0,
        converted: 0,
      });
    }
    return byOwner.get(ownerId)!;
  };

  for (const d of raisedRes.results) {
    const oid = d.properties.hubspot_owner_id;
    if (!oid) continue;
    const row = ensure(oid);
    row.raised = (row.raised ?? 0) + 1;
    if (d.properties.dealstage === "closedwon") {
      row.converted = (row.converted ?? 0) + Number(d.properties[PROP_REVENUE] ?? 0);
    }
  }

  for (const t of ticketsRes.results) {
    const oid = t.properties.hubspot_owner_id;
    if (!oid) continue;
    const row = ensure(oid);
    row.inProgress = (row.inProgress ?? 0) + 1;
  }

  for (const m of meetRes.results) {
    const oid = m.properties.hubspot_owner_id;
    if (!oid) continue;
    const row = ensure(oid);
    row.meetings = (row.meetings ?? 0) + 1;
  }

  const rows = Array.from(byOwner.values()).sort((a, b) => (b.raised ?? 0) - (a.raised ?? 0));

  return {
    totals: {
      meetings: rows.reduce((s, r) => s + (r.meetings ?? 0), 0),
      inProgress: rows.reduce((s, r) => s + (r.inProgress ?? 0), 0),
      raised: rows.reduce((s, r) => s + (r.raised ?? 0), 0),
      converted: rows.reduce((s, r) => s + (r.converted ?? 0), 0),
    },
    rows,
  };
}

const SEED_FARMER: FarmerData = {
  totals: { meetings: 28, inProgress: 12, raised: 47, converted: 195000 },
  rows: [
    { id: "1", name: "Amanda Duarte", email: "amanda@psa.com", meetings: 8, inProgress: 4, raised: 15, converted: 62000 },
    { id: "2", name: "João Backmann", email: "joao@psa.com", meetings: 7, inProgress: 3, raised: 14, converted: 58000 },
    { id: "3", name: "Vitória Schaeffer", email: "vitoria@psa.com", meetings: 7, inProgress: 3, raised: 10, converted: 42000 },
    { id: "4", name: "Willker Belous", email: "willker@psa.com", meetings: 6, inProgress: 2, raised: 8, converted: 33000 },
  ],
};
