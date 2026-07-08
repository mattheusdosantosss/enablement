import nextDynamic from "next/dynamic";
import { getB2BData } from "@/lib/hubspot/b2b";
import { getB2CData } from "@/lib/hubspot/b2c";
import { getFarmerData, type FarmerOrigin } from "@/lib/hubspot/farmer";
import FarmersChartGrid from "@/components/FarmersChartGrid";
import B2BChartGrid from "@/components/B2BChartGrid";
import Link from "next/link";

export const dynamic = "force-dynamic";

const TeamBarChart = nextDynamic(() => import("@/components/TeamBarChart"), { ssr: false });

const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

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
  { key: "crm",      label: "Ação de CRM" },
];

const PERIOD_TABS = [
  { key: "hoje",        label: "Hoje"           },
  { key: "mes",         label: "Este mês"       },
  { key: "mes-passado", label: "Mês passado"    },
  { key: "trimestre",   label: "Este trimestre" },
];

function TabBar({ tabs, activeKey, buildHref, sub }: {
  tabs: { key: string; label: string }[];
  activeKey: string;
  buildHref: (key: string) => string;
  sub?: boolean;
}) {
  return (
    <div className="seg" style={{ marginBottom: sub ? 16 : 28 }}>
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

function parseMes(mes: string): { year: number; month: number } {
  const [y, m] = mes.split("-").map(Number);
  return { year: y, month: m };
}

function addMonths(mes: string, delta: number): string {
  let { year, month } = parseMes(mes);
  month += delta;
  while (month > 12) { month -= 12; year++; }
  while (month < 1)  { month += 12; year--; }
  return `${year}-${String(month).padStart(2, "0")}`;
}

export default async function InicioPage({
  searchParams,
}: {
  searchParams: {
    time?: string; squad?: string; origin?: string;
    valor?: string; mes?: string; period?: string;
  };
}) {
  const now        = new Date();
  const currentMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const time   = (searchParams.time   ?? "b2b")   as "b2b" | "b2c" | "farmers";
  const squad  = searchParams.squad  ?? "todos";
  const origin = (searchParams.origin ?? "ambas") as FarmerOrigin;
  const valor  = (searchParams.valor  ?? "bruto") as "bruto" | "liquido";
  const mes    = searchParams.mes    ?? currentMes;
  const period = searchParams.period ?? "mes";

  const prevMes    = addMonths(mes, -1);
  const nextMes    = addMonths(mes, +1);
  const isCurrentMes = mes === currentMes;

  const { year: mesYear, month: mesMonth } = parseMes(mes);
  const mesLabel = `${MESES_PT[mesMonth - 1]} ${mesYear}`;

  // URL builders
  function mesHref(newMes: string) {
    const p = new URLSearchParams({ time });
    if (time === "farmers") { p.set("squad", squad); p.set("origin", origin); p.set("valor", valor); }
    if (newMes !== currentMes) p.set("mes", newMes);
    return `/inicio?${p.toString()}`;
  }

  function periodHref(newPeriod: string) {
    return `/inicio?${new URLSearchParams({ time: "b2b", period: newPeriod, valor })}`;
  }

  function buildFarmerHref(updates: Record<string, string>) {
    const base: Record<string, string> = { time: "farmers", squad, origin, valor };
    if (mes !== currentMes) base.mes = mes;
    return `/inicio?${new URLSearchParams({ ...base, ...updates }).toString()}`;
  }

  const b2b    = time === "b2b"     ? await getB2BData({ period }).catch(() => null)             : null;
  const b2c    = time === "b2c"     ? await getB2CData({ mes }).catch(() => null)                : null;
  const farmer = time === "farmers" ? await getFarmerData({ origin, mes }).catch(() => null)     : null;

  const visibleSquads = farmer
    ? (squad === "todos" ? farmer.squads : farmer.squads.filter((s) => s.id === squad))
    : [];

  const allRows = visibleSquads.flatMap((s) => s.rows);

  const raisedData  = allRows.map((r) => ({ name: r.name, id: r.id, value: r.raised      ?? 0 }));
  const closedData  = allRows.map((r) => ({ name: r.name, id: r.id, value: r.closedCount ?? 0 }));
  const revenueData = allRows.map((r) => ({
    name: r.name, id: r.id,
    value: valor === "liquido" ? (r.revenueLiquido ?? 0) : (r.converted ?? 0),
  }));
  const tramitaData = allRows.map((r) => ({ name: r.name, id: r.id, value: r.inProgress ?? 0 }));

  const originLabel = ORIGIN_TABS.find(t => t.key === origin)?.label ?? "Ambas";

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-psa), var(--font-sans)", fontSize: 22, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", margin: 0 }}>
            Início
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
            Visão geral de performance
          </p>
        </div>

        {/* B2B: selector de período | B2C/Farmers: navegação de mês */}
        {time === "b2b" ? (
          <div className="seg" style={{ flexShrink: 0 }}>
            {PERIOD_TABS.map((t) => (
              <Link key={t.key} href={periodHref(t.key)}
                className={`seg-item${period === t.key ? " active" : ""}`}>
                {t.label}
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
            <Link href={mesHref(prevMes)} className="seg-item" style={{ padding: "7px 14px", fontSize: 16, fontWeight: 500 }}>‹</Link>
            <div style={{
              padding: "7px 18px", fontSize: 13, fontWeight: 600, color: "var(--text)",
              background: "var(--s2)", border: "1px solid var(--border)", borderRadius: 8,
              minWidth: 148, textAlign: "center",
            }}>
              {mesLabel}
            </div>
            <Link
              href={isCurrentMes ? "#" : mesHref(nextMes)}
              className="seg-item"
              style={{ padding: "7px 14px", fontSize: 16, fontWeight: 500, opacity: isCurrentMes ? 0.3 : 1, pointerEvents: isCurrentMes ? "none" : "auto" }}
            >
              ›
            </Link>
          </div>
        )}
      </div>

      {/* Tabs primárias */}
      <TabBar tabs={TIME_TABS} activeKey={time}
        buildHref={(key) => {
          const p = new URLSearchParams({ time: key });
          if (key !== "b2b" && mes !== currentMes) p.set("mes", mes);
          return `/inicio?${p}`;
        }}
      />

      {/* B2B */}
      {time === "b2b" && (
        b2b ? (
          <B2BChartGrid
            meetingsData={b2b.rows.map((r) => ({ name: r.name, value: r.meetings     ?? 0 }))}
            dealsData={   b2b.rows.map((r) => ({ name: r.name, value: r.deals        ?? 0 }))}
            revenueData={ b2b.rows.map((r) => ({
              name: r.name,
              value: valor === "liquido" ? (r.revenue ?? 0) : (r.revenueBruto ?? 0),
            }))}
            valor={valor}
            period={period}
            periodLabel={b2b.periodLabel}
            totals={{
              meetings: b2b.totals.meetings,
              deals:    b2b.totals.deals,
              revenue:  valor === "liquido" ? b2b.totals.revenue : b2b.totals.revenueBruto,
            }}
          />
        ) : <EmptyState label="Sem dados para o time B2B" />
      )}

      {/* B2C */}
      {time === "b2c" && (
        b2c ? (
          <TeamBarChart
            title="Time B2C"
            subtitle={`Receita líquida por closer · ${mesLabel}`}
            data={b2c.rows.map((r) => ({ name: r.name, value: r.revenue ?? 0 }))}
            color="var(--blue)"
            format="brl"
            metric="Receita líquida"
          />
        ) : <EmptyState label="Sem dados para o time B2C" />
      )}

      {/* Farmers */}
      {time === "farmers" && (
        farmer ? (
          <>
            <TabBar tabs={SQUAD_TABS} activeKey={squad}
              buildHref={(key) => buildFarmerHref({ squad: key })} sub />

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
              <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Origem</span>
              <div className="seg">
                {ORIGIN_TABS.map((t) => (
                  <Link key={t.key} href={buildFarmerHref({ origin: t.key })}
                    className={`seg-item${origin === t.key ? " active" : ""}`}>
                    {t.label}
                  </Link>
                ))}
              </div>
            </div>

            {allRows.length === 0 ? (
              <EmptyState label="Nenhum farmer encontrado" />
            ) : (
              <FarmersChartGrid
                raisedData={raisedData}
                closedData={closedData}
                revenueData={revenueData}
                tramitaData={tramitaData}
                valor={valor}
                origin={origin}
                mes={mes}
                squad={squad}
                currentMes={currentMes}
                mesLabel={mesLabel}
                originLabel={originLabel}
              />
            )}
          </>
        ) : <EmptyState label="Sem dados para o time Farmers" />
      )}
    </div>
  );
}
