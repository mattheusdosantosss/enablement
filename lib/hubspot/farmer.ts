import { hs, hsPost } from "./client";
import { FARMER_SQUADS, ALL_FARMER_EMAILS } from "@/lib/teams";
import type { ProfRow } from "@/components/ProfessionalTable";
import type { FarmerSquadGroup } from "@/components/FarmerTable";

// Mesmos stage IDs do psa-farmer
const STAGE_GANHO_CONTRATO   = process.env.HUBSPOT_STAGE_GANHO_CONTRATO   || "1076664460";
const STAGE_NEGOCIO_FECHADO  = process.env.HUBSPOT_STAGE_NEGOCIO_FECHADO  || "1076664462";
const PIPELINE_CS            = process.env.HUBSPOT_PIPELINE_CS            || "748675953";

const GANHO_STAGES = [STAGE_GANHO_CONTRATO, STAGE_NEGOCIO_FECHADO];

// Origens válidas — idêntico ao psa-farmer
const FARMER_LEAD_ORIGINS = ["Carteira do Farmer", "Curador"];

// Ajuste fuso BRT (UTC-3) para campos datetime
const BR_OFFSET_MS = 3 * 60 * 60 * 1000;

function monthRange() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const yyyymmdd = (d: Date) => d.toISOString().slice(0, 10);
  return { from: yyyymmdd(firstDay), to: yyyymmdd(now) };
}

const utcStart = (d: string) => new Date(d).getTime();
const utcEnd   = (d: string) => new Date(d).getTime() + 86_400_000 - 1;
const brtStart = (d: string) => new Date(d).getTime() + BR_OFFSET_MS;
const brtEnd   = (d: string) => new Date(d).getTime() + BR_OFFSET_MS + 86_400_000 - 1;

export interface FarmerData {
  totals: { meetings: number; inProgress: number; raised: number; converted: number };
  rows: ProfRow[];
  squads: FarmerSquadGroup[];
}

// ── Resolve emails → ownerIds ─────────────────────────────────────────────────
async function resolveOwnerIds(): Promise<Map<string, string>> {
  const data = await hs<{ results: { id: string; email: string }[] }>(
    "/crm/v3/owners?limit=200"
  );
  const map = new Map<string, string>(); // email → ownerId
  for (const o of data.results) {
    const email = (o.email ?? "").toLowerCase();
    if (ALL_FARMER_EMAILS.has(email)) map.set(email, o.id);
  }
  return map;
}

// ── Resolve estágios CS dinamicamente ─────────────────────────────────────────
let csStagesCache: { abertos: string[]; } | null = null;

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

// ── Fetch deals de demandas levantadas (por data de qualificação) ──────────────
async function fetchRaisedDeals(ownerIds: string[], from: string, to: string) {
  const body = {
    filterGroups: [{
      filters: [
        { propertyName: "pipedrive___data_de_qualificacao", operator: "HAS_PROPERTY" },
        { propertyName: "origem_do_lead", operator: "IN", values: FARMER_LEAD_ORIGINS },
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
  };
  const res = await hsPost<{ results: { properties: Record<string, string> }[] }>(
    "/crm/v3/objects/deals/search", body
  );
  return res.results;
}

// ── Fetch deals ganhos no mês (por closedate) ──────────────────────────────────
async function fetchConvertedDeals(ownerIds: string[], from: string, to: string) {
  const body = {
    filterGroups: [{
      filters: [
        { propertyName: "origem_do_lead", operator: "IN", values: FARMER_LEAD_ORIGINS },
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
  };
  const res = await hsPost<{ results: { properties: Record<string, string> }[] }>(
    "/crm/v3/objects/deals/search", body
  );
  // Exclui "Fora do MOA" — idêntico ao psa-farmer
  return res.results.filter(
    (d) => d.properties.closed_lost_reason !== "Fora do MOA"
  );
}

// ── Fetch tickets CS em andamento (snapshot ao vivo) ──────────────────────────
async function fetchCsInProgress(ownerIds: string[], abertos: string[]) {
  if (!abertos.length) return [];
  const body = {
    filterGroups: [{
      filters: [
        { propertyName: "hs_pipeline", operator: "EQ", value: PIPELINE_CS },
        { propertyName: "hs_pipeline_stage", operator: "IN", values: abertos },
        { propertyName: "hubspot_owner_id", operator: "IN", values: ownerIds.slice(0, 100) },
      ],
    }],
    properties: ["hubspot_owner_id"],
    limit: 200,
  };
  const res = await hsPost<{ results: { properties: Record<string, string> }[] }>(
    "/crm/v3/objects/tickets/search", body
  );
  return res.results;
}

// ── Fetch reuniões agendadas no mês ───────────────────────────────────────────
async function fetchMeetings(ownerIds: string[], from: string, to: string) {
  const body = {
    filterGroups: [{
      filters: [
        { propertyName: "hubspot_owner_id", operator: "IN", values: ownerIds.slice(0, 100) },
        { propertyName: "hs_timestamp", operator: "GTE", value: String(brtStart(from)) },
        { propertyName: "hs_timestamp", operator: "LTE", value: String(brtEnd(to)) },
      ],
    }],
    properties: ["hubspot_owner_id"],
    limit: 200,
  };
  const res = await hsPost<{ results: { properties: Record<string, string> }[] }>(
    "/crm/v3/objects/meetings/search", body
  );
  return res.results;
}

// ── Main ───────────────────────────────────────────────────────────────────────
export async function getFarmerData(): Promise<FarmerData> {
  if (!process.env.HUBSPOT_TOKEN) return SEED_FARMER;

  const { from, to } = monthRange();

  const [emailToOwner, csStages] = await Promise.all([
    resolveOwnerIds().catch(() => new Map<string, string>()),
    resolveCsStages(),
  ]);

  const allOwnerIds = Array.from(emailToOwner.values());
  if (!allOwnerIds.length) return SEED_FARMER;

  const [raised, converted, tickets, meetings] = await Promise.all([
    fetchRaisedDeals(allOwnerIds, from, to).catch(() => []),
    fetchConvertedDeals(allOwnerIds, from, to).catch(() => []),
    fetchCsInProgress(allOwnerIds, csStages.abertos).catch(() => []),
    fetchMeetings(allOwnerIds, from, to).catch(() => []),
  ]);

  // Resolve nomes via owners
  const ownersData = await hs<{ results: { id: string; firstName: string; lastName: string; email: string }[] }>(
    "/crm/v3/owners?limit=200"
  );
  const ownerById = new Map(ownersData.results.map((o) => [o.id, o]));

  // ── Agregar por squad ────────────────────────────────────────────────────────
  const squadGroups: FarmerSquadGroup[] = FARMER_SQUADS.map((squad) => {
    const rows: ProfRow[] = squad.members.map((email) => {
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

      row.raised = raised.filter(
        (d) => d.properties.sdrfarmer_responsavel === ownerId
      ).length;

      row.converted = converted
        .filter((d) => d.properties.sdrfarmer_responsavel === ownerId)
        .reduce((s, d) => {
          const v = d.properties.valor_total_do_contrato__bruto___ganho_;
          return s + Number(v || d.properties.amount || 0);
        }, 0);

      row.inProgress = tickets.filter(
        (t) => t.properties.hubspot_owner_id === ownerId
      ).length;

      row.meetings = meetings.filter(
        (m) => m.properties.hubspot_owner_id === ownerId
      ).length;

      return row;
    });

    rows.sort((a, b) => (b.raised ?? 0) - (a.raised ?? 0));
    return { id: squad.id, label: squad.label, rows };
  });

  const allRows = squadGroups.flatMap((s) => s.rows);

  return {
    totals: {
      meetings:   allRows.reduce((s, r) => s + (r.meetings ?? 0), 0),
      inProgress: allRows.reduce((s, r) => s + (r.inProgress ?? 0), 0),
      raised:     allRows.reduce((s, r) => s + (r.raised ?? 0), 0),
      converted:  allRows.reduce((s, r) => s + (r.converted ?? 0), 0),
    },
    rows: allRows,
    squads: squadGroups,
  };
}

// ── Seed ───────────────────────────────────────────────────────────────────────
const SEED_SQUADS: FarmerSquadGroup[] = FARMER_SQUADS.map((squad, si) => ({
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
  totals: { meetings: 28, inProgress: 12, raised: 47, converted: 195000 },
  rows: SEED_SQUADS.flatMap((s) => s.rows),
  squads: SEED_SQUADS,
};
