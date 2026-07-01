import { NextResponse } from "next/server";
import { lerSessao, COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";
import { hs, hsPost } from "@/lib/hubspot/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = lerSessao(cookies().get(COOKIE)?.value);
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });

  const results: Record<string, unknown> = {};

  // 1. Owners
  try {
    const owners = await hs<{ results: { id: string; email: string; firstName: string; lastName: string }[] }>(
      "/crm/v3/owners?limit=200"
    );
    results.owners = owners.results.map((o) => ({ id: o.id, email: o.email, name: `${o.firstName} ${o.lastName}` }));
  } catch (e) { results.owners_error = String(e); }

  // 2. Sample deals (sem filtro) — mostra as propriedades reais
  try {
    const sample = await hsPost<{ results: { id: string; properties: Record<string, string> }[] }>(
      "/crm/v3/objects/deals/search",
      {
        filterGroups: [{ filters: [
          { propertyName: "sdrfarmer_responsavel", operator: "HAS_PROPERTY" },
        ]}],
        properties: [
          "dealname",
          "dealstage",
          "origem_do_lead",
          "sdrfarmer_responsavel",
          "pipedrive___data_de_qualificacao",
          "closedate",
          "amount",
          "valor_total_do_contrato__bruto___ganho_",
          "closed_lost_reason",
          "hubspot_owner_id",
        ],
        limit: 5,
        sorts: [{ propertyName: "closedate", direction: "DESCENDING" }],
      }
    );
    results.sample_deals = sample.results.map((d) => ({ id: d.id, props: d.properties }));
  } catch (e) { results.sample_deals_error = String(e); }

  // 3. Sample tickets CS
  try {
    const tickets = await hsPost<{ results: { id: string; properties: Record<string, string> }[] }>(
      "/crm/v3/objects/tickets/search",
      {
        filterGroups: [{ filters: [
          { propertyName: "hs_pipeline", operator: "EQ", value: "748675953" },
        ]}],
        properties: ["hs_pipeline", "hs_pipeline_stage", "hubspot_owner_id", "subject"],
        limit: 5,
      }
    );
    results.sample_tickets = tickets.results.map((t) => ({ id: t.id, props: t.properties }));
  } catch (e) { results.sample_tickets_error = String(e); }

  // 4. Valores distintos de origem_do_lead
  try {
    const origins = await hsPost<{ results: { properties: Record<string, string> }[] }>(
      "/crm/v3/objects/deals/search",
      {
        filterGroups: [{ filters: [
          { propertyName: "origem_do_lead", operator: "HAS_PROPERTY" },
          { propertyName: "sdrfarmer_responsavel", operator: "HAS_PROPERTY" },
        ]}],
        properties: ["origem_do_lead", "sdrfarmer_responsavel"],
        limit: 100,
      }
    );
    const originSet = new Set(origins.results.map((d) => d.properties.origem_do_lead));
    const ownerSet  = new Set(origins.results.map((d) => d.properties.sdrfarmer_responsavel));
    results.distinct_origem_do_lead = Array.from(originSet);
    results.distinct_sdrfarmer_ids  = Array.from(ownerSet);
  } catch (e) { results.distinct_error = String(e); }

  // 5. Stages da pipeline CS
  try {
    const pipeline = await hs<{ stages: { id: string; label: string }[] }>(
      "/crm/v3/pipelines/tickets/748675953"
    );
    results.cs_stages = pipeline.stages;
  } catch (e) { results.cs_stages_error = String(e); }

  return NextResponse.json(results, { headers: { "Content-Type": "application/json" } });
}
