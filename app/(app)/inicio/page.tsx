import nextDynamic from "next/dynamic";
import { getB2BData } from "@/lib/hubspot/b2b";
import { getB2CData } from "@/lib/hubspot/b2c";
import { getFarmerData, type FarmerOrigin } from "@/lib/hubspot/farmer";
import Link from "next/link";

export const dynamic = "force-dynamic";

const TeamBarChart = nextDynamic(() => import("@/components/TeamBarChart"), { ssr: false });

const TIME_TABS = [
  { key: "b2b",     label: "Closers B2B" },
  { key: "b2c",     label: "Closers B2C" },
  { key: "farmers", label: "Farmers"     },
];

const SQUAD_TABS = [
  { key: "todos",   label: "Todos"         },
  { key: "dani",    label: "Squad Dani"    },
  { key: "katyeli", label: "Squad Katyeli" },
  { key: "leticia", label: "Squad Leticia" },
];

const ORIGIN_TABS = [
  { key: "ambas",    label: "Ambas"       },
  { key: "carteira", label: "Carteira"    },
  { key: "crm",      label: "Acao de CRM" },
];

const VALOR_TABS = [
  { key: "bruto",   label: "Bruto"   },
  { key: "liquido", label: "Liquido" },
];

function TabBar({ tabs, activeKey, buildHref, sub }: {
  tabs: { key: string; label: string }[];
  activeKey: string;
  buildHref: (key: string) => string;
  sub?: boolean;
}) {
  return (
    <div className="seg" style={{ marginBottom: sub ? 20 : 28 }}>
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <Link key={tab.key} href={buildHref(tab.key)}
            className={`seg-item${active ? ` active${sub ? " sub" : ""}` : ""}`}>
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="card"><div className="empty">{label}</div></div>;
}

export default async function InicioPage({
  searchParams,
}: {
  searchParams: { time?: string; squad?: string; origin?: string; valor?: string };
}) {
  const time   = (searchParams.time   ?? "b2b")     as "b2b" | "b2c" | "farmers";
  const squad  = searchParams.squad  ?? "todos";
  const origin = (searchParams.origin ?? "ambas")   as FarmerOrigin;
  const valor  = (searchParams.valor  ?? "bruto")   as "bruto" | "liquido";

  const b2b    = time === "b2b"     ? await getB2BData().catch(() => null)              : null;
  const b2c    = time === "b2c"     ? await getB2CData().catch(() => null)              : null;
  const farmer = time === "farmers" ? await getFarmerData({ origin }).catch(() => null) : null;

  const visibleSquads = farmer
    ? (squad === "todos" ? farmer.squads : farmer.squads.filter((s) => s.id === squad))
    : [];

  const allRows = visibleSquads.flatMap((s) => s.rows);

  // Dados por gráfico
  const raisedData   = allRows.map((r) => ({ name: r.name, value: r.raised      ?? 0 }));
  const closedData   = allRows.map((r) => ({ name: r.name, value: r.closedCount ?? 0 }));
  const revenueData  = allRows.map((r) => ({
    name: r.name,
    value: valor === "liquido" ? (r.revenueLiquido ?? 0) : (r.converted ?? 0),
  }));
  const tramitaData  = allRows.map((r) => ({ name: r.name, value: r.inProgress  ?? 0 }));

  function buildFarmerHref(updates: Record<string, string>) {
    const p = new URLSearchParams({ time: "farmers", squad, origin, valor, ...updates });
    return `/inicio?${p.toString()}`;
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "var(--font-psa), var(--font-sans)", fontSize: 22, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", margin: 0 }}>
          Inicio
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
          Visao geral de performance - mes atual
        </p>
      </div>

      {/* Tabs primárias */}
      <TabBar tabs={TIME_TABS} activeKey={time} buildHref={(key) => `/inicio?time=${key}`} />

      {/* B2B */}
      {time === "b2b" && (
        b2b ? (
          <TeamBarChart
            title="Time B2B"
            subtitle="Vendas fechadas por closer"
            data={b2b.rows.map((r) => ({ name: r.name, value: r.deals ?? 0 }))}
            color="var(--accent)"
            metric="Vendas"
          />
        ) : <EmptyState label="Sem dados para o time B2B" />
      )}

      {/* B2C */}
      {time === "b2c" && (
        b2c ? (
          <TeamBarChart
            title="Time B2C"
            subtitle="Receita liquida por closer"
            data={b2c.rows.map((r) => ({ name: r.name, value: r.revenue ?? 0 }))}
            color="var(--blue)"
            format="brl"
            metric="Receita liquida"
          />
        ) : <EmptyState label="Sem dados para o time B2C" />
      )}

      {/* Farmers */}
      {time === "farmers" && (
        farmer ? (
          <>
            {/* Sub-tabs squad */}
            <TabBar
              tabs={SQUAD_TABS}
              activeKey={squad}
              buildHref={(key) => buildFarmerHref({ squad: key })}
              sub
            />

            {/* Controles: Origem + Bruto/Líquido */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Origem
                </span>
                <div className="seg">
                  {ORIGIN_TABS.map((t) => (
                    <Link key={t.key} href={buildFarmerHref({ origin: t.key })}
                      className={`seg-item${origin === t.key ? " active" : ""}`}>
                      {t.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Receita
                </span>
                <div className="seg">
                  {VALOR_TABS.map((t) => (
                    <Link key={t.key} href={buildFarmerHref({ valor: t.key })}
                      className={`seg-item${valor === t.key ? " active" : ""}`}>
                      {t.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* 4 gráficos em grid 2×2 */}
            {allRows.length === 0 ? (
              <EmptyState label="Nenhum farmer encontrado para este squad" />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <TeamBarChart
                  title="Demandas Levantadas"
                  subtitle={`Origem: ${ORIGIN_TABS.find(t => t.key === origin)?.label} · Data de qualificacao no mes`}
                  data={raisedData}
                  color="var(--orange)"
                  metric="Demandas"
                />
                <TeamBarChart
                  title="Negocios Fechados"
                  subtitle={`Origem: ${ORIGIN_TABS.find(t => t.key === origin)?.label} · Fechamento no mes`}
                  data={closedData}
                  color="var(--blue)"
                  metric="Negocios"
                />
                <TeamBarChart
                  title={`Receita Total (${valor === "liquido" ? "Liquida" : "Bruta"})`}
                  subtitle={`Origem: ${ORIGIN_TABS.find(t => t.key === origin)?.label} · Fechamento no mes`}
                  data={revenueData}
                  color="var(--green)"
                  format="brl"
                  metric={valor === "liquido" ? "Receita liquida" : "Receita bruta"}
                />
                <TeamBarChart
                  title="Tramitacoes em Andamento"
                  subtitle="Pipeline CS · Snapshot ao vivo (sem filtro de periodo)"
                  data={tramitaData}
                  color="var(--accent)"
                  metric="Tramitacoes"
                />
              </div>
            )}
          </>
        ) : <EmptyState label="Sem dados para o time Farmers" />
      )}
    </div>
  );
}
