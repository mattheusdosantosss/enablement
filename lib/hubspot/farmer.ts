import { hs, hsPost, hsPostAll } from "./client";
import { getTeamConfig } from "@/lib/config";
import { FARMER_SQUADS as STATIC_FARMER_SQUADS } from "@/lib/teams";
import type { ProfRow } from "@/components/ProfessionalTable";
import type { FarmerSquadGroup } from "@/components/FarmerTable";

const STAGE_GANHO_CONTRATO   = process.env.HUBSPOT_STAGE_GANHO_CONTRATO   || "1076664460";
const STAGE_NEGOCIO_FECHADO  = process.env.HUBSPOT_STAGE_NEGOCIO_FECHADO  || "1076664462";
const PIPELINE_CS            = process.env.HUBSPOT_PIPELINE_CS            || "748675953";

const GANHO_STAGES = [STAGE_GANHO_CONTRATO, STAGE_NEGOCIO_FECHADO];

export type FarmerOrigin = "carteira" | "crm" | "ambas";

export const ORIGIN_LABELS: Record<Exclude<FarmerOrigin, "ambas">, string[]> = {
  carteira: ["Carteira do Farmer"],
  crm:      ["Curador"],
};

// ── Resolve valores internos de enum para origem_do_lead ──────────────────────
let _originOptionsCache: { label: string; value: string }[] | null = null;

async function fetchOriginOptions() {
  if (_originOptionsCache !== null) return _originOptionsCache;
  try {
    const data = await hs<{ options: { label: string; value: string; hidden?: boolean }[] }>(
      "/crm/v3/properties/deals/origem_do_lead"
    );
    _originOptionsCache = (data.options ?? []).filter((o) => !o.hidden);
  } catch {
    _originOptionsCache = [];
  }
  return _originOptionsCache;
}

export async function resolveOriginValues(labels: string[]): Promise<string[]> {
  const options = await fetchOriginOptions();
  if (!options.length) return labels;
  return labels.map((label) => {
    const opt =
      options.find((o) => o.label === label) ??
      options.find((o) => o.label.toLowerCase() === label.toLowerCase()) ??
      options.find((o) => o.value === label);
    return opt ? opt.value : label;
  });
}

// Helper para a API route: resolve origins a partir do FarmerOrigin
export async function getOrigins(origin: FarmerOrigin): Promise<string[] | null> {
  if (origin === "ambas") return null;
  return resolveOriginValues(ORIGIN_LABELS[origin]);
}

export interface FarmerOptions {
  origin?: FarmerOrigin;
  mes?: string;
}

const BR_OFFSET_MS = 3 * 60 * 60 * 1000;

export function monthRange(mes?: string) {
  let year: number, month: number;
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    [year, month] = mes.split("-").map(Number);
    month -= 1;
  } else {
    const n = new Date(); year = n.getFullYear(); month = n.getMonth();
  }
  const now = new Date();
  const isCurrent = year === now.getFullYear() && month === now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay  = isCurrent ? now : new Date(year, month + 1, 0);
  const yyyymmdd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: yyyymmdd(firstDay), to: yyyymmdd(lastDay) };
}

const utcStart = (d: string) => new Date(d).getTime();
const utcEnd   = (d: string) => new Date(d).getTime() + 86_400_000 - 1;
const brtStart = (d: string) => new Date(d).getTime() + BR_OFFSET_MS;
const brtEnd   = (d: string) => new Date(d).getTime() + BR_OFFSET_MS + 86_400_000 - 1;

export interface FarmerData {
  totals: {
    meetings: number;
    inProgress: number;
    raised: number;
    converted: number;
    closedCount: number;
    revenueLiquido: number;
  };
  rows: ProfRow[];
  squads: FarmerSquadGroup[];
}

export interface FarmerDealItem {
  id: string;
  name: string;
  date: string;
}

// ── Resolve emails → ownerIds ─────────────────────────────────────────────────
async function resolveOwnerIds(allEmails: Set<string>): Promise<Map<string, string>> {
  const data = await hs<{ results: { id: string; email: string }[] }>(
    "/crm/v3/owners?limit=200"
  );
  const map = new Map<string, string>();
  for (const o of data.results) {
    const email = (o.email ?? "").toLowerCase();
    if (allEmails.has(email)) map.set(email, o.id);
  }
  return map;
}

// ── Resolve estágios CS dinamicamente ─────────────────────────────────────────
let csStagesCache: { abertos: string[] } | null = null;

async function resolveCsStages(): Promise<{ abertos: string[] }> {
  if (csStagesCache) return csStagesCache;
  try {
    const data = await hs<{ stages: { id: string; label: string }[] }>(
      `/crm/v3/pipelines/tickets/${PIPELINE_CS}`
    );
    const abertos: string[] = [];
    for (const s of data.stages) {
      const l = s.label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      if (/andamento|iniciar/i.test(l)) abertos.push(s.id);
    }
    csStagesCache = { abertos };
    return csStagesCache;
  } catch {
    return { abertos: [] };
  }
}

// ── Fetch deals levantadas (paginado) ─────────────────────────────────────────
async function fetchRaisedDeals(ownerIds: string[], from: string, to: string, origins: string[] | null) {
  const originFilter = origins ? [{ propertyName: "origem_do_lead", operator: "IN", values: origins }] : [];
  return hsPostAll("/crm/v3/objects/deals/search", {
    filterGroups: [{
      filters: [
        { propertyName: "pipedrive___data_de_qualificacao", operator: "HAS_PROPERTY" },
        ...originFilter,
        { propertyName: "sdrfarmer_responsavel", operator: "IN", values: ownerIds.slice(0, 100) },
        { propertyName: "pipedrive___data_de_qualificacao", operator: "GTE", value: String(utcStart(from)) },
        { propertyName: "pipedrive___data_de_qualificacao", operator: "LTE", value: String(utcEnd(to)) },
      ],
    }],
    properties: [
      "sdrfarmer_responsavel",
      "dealstage",
      "pipedrive___data_de_qualificacao",
      "valor_total_do_contrato__bruto___ganho_",
      "amount",
      "closed_lost_reason",
    ],
    limit: 200,
  });
}

// ── Fetch deals convertidas (paginado) ────────────────────────────────────────
async function fetchConvertedDeals(ownerIds: string[], from: string, to: string, origins: string[] | null) {
  const originFilter = origins ? [{ propertyName: "origem_do_lead", operator: "IN", values: origins }] : [];
  const results = await hsPostAll("/crm/v3/objects/deals/search", {
    filterGroups: [{
      filters: [
        ...originFilter,
        { propertyName: "sdrfarmer_responsavel", operator: "IN", values: ownerIds.slice(0, 100) },
        { propertyName: "dealstage", operator: "IN", values: GANHO_STAGES },
        { propertyName: "closedate", operator: "GTE", value: String(brtStart(from)) },
        { propertyName: "closedate", operator: "LTE", value: String(brtEnd(to)) },
      ],
    }],
    properties: [
      "sdrfarmer_responsavel",
      "valor_total_do_contrato__bruto___ganho_",
      "amount",
      "closed_lost_reason",
    ],
    limit: 200,
  });
  return results.filter((d) => d.properties.closed_lost_reason !== "Fora do MOA");
}

// ── Fetch tickets CS (paginado) ───────────────────────────────────────────────
async function fetchCsInProgress(ownerIds: string[], abertos: string[]) {
  if (!abertos.length) return [];
  return hsPostAll("/crm/v3/objects/tickets/search", {
    filterGroups: [{
      filters: [
        { propertyName: "hs_pipeline", operator: "EQ", value: PIPELINE_CS },
        { propertyName: "hs_pipeline_stage", operator: "IN", values: abertos },
        { propertyName: "hubspot_owner_id", operator: "IN", values: ownerIds.slice(0, 100) },
      ],
    }],
    properties: ["hubspot_owner_id"],
    limit: 200,
  });
}

// ── Fetch reuniões (paginado) ─────────────────────────────────────────────────
async function fetchMeetings(ownerIds: string[], from: string, to: string) {
  return hsPostAll("/crm/v3/objects/meetings/search", {
    filterGroups: [{
      filters: [
        { propertyName: "hubspot_owner_id", operator: "IN", values: ownerIds.slice(0, 100) },
        { propertyName: "hs_timestamp", operator: "GTE", value: String(brtStart(from)) },
        { propertyName: "hs_timestamp", operator: "LTE", value: String(brtEnd(to)) },
      ],
    }],
    properties: ["hubspot_owner_id"],
    limit: 200,
  });
}

// ── Deals de um farmer específico (para o modal) ──────────────────────────────
export async function getFarmerDealsList(
  ownerId: string,
  type: "raised" | "converted",
  mes: string,
  origins: string[] | null
): Promise<FarmerDealItem[]> {
  const { from, to } = monthRange(mes || undefined);
  const originFilter = origins ? [{ propertyName: "origem_do_lead", operator: "IN", values: origins }] : [];

  if (type === "raised") {
    const results = await hsPostAll("/crm/v3/objects/deals/search", {
      filterGroups: [{
        filters: [
          { propertyName: "pipedrive___data_de_qualificacao", operator: "HAS_PROPERTY" },
          ...originFilter,
          { propertyName: "sdrfarmer_responsavel", operator: "EQ", value: ownerId },
          { propertyName: "pipedrive___data_de_qualificacao", operator: "GTE", value: String(utcStart(from)) },
          { propertyName: "pipedrive___data_de_qualificacao", operator: "LTE", value: String(utcEnd(to)) },
        ],
      }],
      properties: ["dealname", "pipedrive___data_de_qualificacao"],
      limit: 200,
      sorts: [{ propertyName: "pipedrive___data_de_qualificacao", direction: "DESCENDING" }],
    });
    return results.map((d) => ({
      id: d.id,
      name: d.properties.dealname || "(sem nome)",
      date: d.properties.pipedrive___data_de_qualificacao || "",
    }));
  } else {
    const results = await hsPostAll("/crm/v3/objects/deals/search", {
      filterGroups: [{
        filters: [
          ...originFilter,
          { propertyName: "sdrfarmer_responsavel", operator: "EQ", value: ownerId },
          { propertyName: "dealstage", operator: "IN", values: GANHO_STAGES },
          { propertyName: "closedate", operator: "GTE", value: String(brtStart(from)) },
          { propertyName: "closedate", operator: "LTE", value: String(brtEnd(to)) },
        ],
      }],
      properties: ["dealname", "closedate", "closed_lost_reason"],
      limit: 200,
      sorts: [{ propertyName: "closedate", direction: "DESCENDING" }],
    });
    return results
      .filter((d) => d.properties.closed_lost_reason !== "Fora do MOA")
      .map((d) => ({
        id: d.id,
        name: d.properties.dealname || "(sem nome)",
        date: d.properties.closedate || "",
      }));
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────
export async function getFarmerData(opts?: FarmerOptions): Promise<FarmerData> {
  if (!process.env.HUBSPOT_TOKEN) return SEED_FARMER;

  const originLabels: string[] | null = (!opts?.origin || opts.origin === "ambas")
    ? null
    : ORIGIN_LABELS[opts.origin];
  const origins: string[] | null = originLabels
    ? await resolveOriginValues(originLabels)
    : null;

  const { farmerSquads: FARMER_SQUADS } = await getTeamConfig();
  const ALL_FARMER_EMAILS = new Set(FARMER_SQUADS.flatMap((s) => s.members.map((m) => m.email.toLowerCase())));

  const { from, to } = monthRange(opts?.mes);

  const [emailToOwner, csStages] = await Promise.all([
    resolveOwnerIds(ALL_FARMER_EMAILS).catch(() => new Map<string, string>()),
    resolveCsStages(),
  ]);

  const allOwnerIds = Array.from(emailToOwner.values());
  if (!allOwnerIds.length) return SEED_FARMER;

  const [raised, converted, tickets, meetings] = await Promise.all([
    fetchRaisedDeals(allOwnerIds, from, to, origins).catch(() => []),
    fetchConvertedDeals(allOwnerIds, from, to, origins).catch(() => []),
    fetchCsInProgress(allOwnerIds, csStages.abertos).catch(() => []),
    fetchMeetings(allOwnerIds, from, to).catch(() => []),
  ]);

  const ownersData = await hs<{ results: { id: string; firstName: string; lastName: string; email: string }[] }>(
    "/crm/v3/owners?limit=200"
  );
  const ownerById = new Map(ownersData.results.map((o) => [o.id, o]));

  const squadGroups: FarmerSquadGroup[] = FARMER_SQUADS.map((squad) => {
    const rows: ProfRow[] = squad.members.map((m) => {
      const email = (m as { email: string }).email ?? String(m);
      const ownerId = emailToOwner.get(email);
      const owner = ownerId ? ownerById.get(ownerId) : undefined;
      const row: ProfRow = {
        id: ownerId ?? email,
        name: owner
          ? (`${owner.firstName ?? ""} ${owner.lastName ?? ""}`.trim() || owner.email)
          : email,
        email,
        meetings: 0,
        inProgress: 0,
        raised: 0,
        converted: 0,
      };
      if (!ownerId) return row;

      const myRaised    = raised.filter((d) => d.properties.sdrfarmer_responsavel === ownerId);
      const myConverted = converted.filter((d) => d.properties.sdrfarmer_responsavel === ownerId);
      const myTickets   = tickets.filter((t) => t.properties.hubspot_owner_id === ownerId);
      const myMeetings  = meetings.filter((mm) => mm.properties.hubspot_owner_id === ownerId);

      row.raised    = myRaised.length;
      row.converted = myConverted.reduce((s, d) => {
        const v = d.properties.valor_total_do_contrato__bruto___ganho_;
        return s + Number(v || d.properties.amount || 0);
      }, 0);
      row.closedCount    = myConverted.length;
      row.revenueLiquido = myConverted.reduce((s, d) => s + Number(d.properties.amount || 0), 0);
      row.inProgress = myTickets.length;
      row.meetings   = myMeetings.length;

      return row;
    });

    rows.sort((a, b) => (b.raised ?? 0) - (a.raised ?? 0));
    return { id: squad.id, label: squad.label, rows };
  });

  const allRows = squadGroups.flatMap((s) => s.rows);

  return {
    totals: {
      meetings:       allRows.reduce((s, r) => s + (r.meetings ?? 0), 0),
      inProgress:     allRows.reduce((s, r) => s + (r.inProgress ?? 0), 0),
      raised:         allRows.reduce((s, r) => s + (r.raised ?? 0), 0),
      converted:      allRows.reduce((s, r) => s + (r.converted ?? 0), 0),
      closedCount:    allRows.reduce((s, r) => s + (r.closedCount ?? 0), 0),
      revenueLiquido: allRows.reduce((s, r) => s + (r.revenueLiquido ?? 0), 0),
    },
    rows: allRows,
    squads: squadGroups,
  };
}

// ── Seed ───────────────────────────────────────────────────────────────────────
const SEED_SQUADS: FarmerSquadGroup[] = STATIC_FARMER_SQUADS.map((squad, si) => ({
  id: squad.id,
  label: squad.label,
  rows: squad.members.map((email, i) => ({
    id: `${si}-${i}`,
    name: email.split("@")[0].replace(".", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    email,
    meetings:   Math.max(0, 8 - i - si),
    inProgress: Math.max(0, 4 - i),
    raised:     Math.max(0, 12 - i * 2 - si),
    converted:  Math.max(0, 50000 - i * 8000 - si * 5000),
  })),
}));

const SEED_FARMER: FarmerData = {
  totals: { meetings: 28, inProgress: 12, raised: 47, converted: 195000, closedCount: 8, revenueLiquido: 170000 },
  rows: SEED_SQUADS.flatMap((s) => s.rows),
  squads: SEED_SQUADS,
};
