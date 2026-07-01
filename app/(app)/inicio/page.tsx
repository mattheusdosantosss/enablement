import nextDynamic from "next/dynamic";
import { getB2BData } from "@/lib/hubspot/b2b";
import { getB2CData } from "@/lib/hubspot/b2c";
import { getFarmerData, type FarmerOrigin } from "@/lib/hubspot/farmer";
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
  searchParams: { time?: string; squad?: string; origin?: string; valor?: string; mes?: string };
}) {
  const now        = new Date();
  const currentMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const time   = (searchParams.time   ?? "b2b")     as "b2b" | "b2c" | "farmers";
  const squad  = searchParams.squad  ?? "todos";
  const origin = (searchParams.origin ?? "ambas")   as FarmerOrigin;
  const valor  = (searchParams.valor  ?? "bruto")   as "bruto" | "liquido";
  const mes    = searchParams.mes    ?? currentMes;

  const prevMes = addMonths(mes, -1);
  const nextMes = addMonths(mes, +1);
  const isCurrentMes = mes === currentMes;

  const { year: mesYear, month: mesMonth } = parseMes(mes);
  const mesLabel = `${MESES_PT[mesMonth - 1]} ${mesYear}`;

  // URL builders preservando todos os params relevantes
  function mesHref(newMes: string) {
    const p = new URLSearchParams({ time });
    if (time === "farmers") { p.set("squad", squad); p.set("origin", origin); p.set("valor", valor); }
    if (newMes !== currentMes) p.set("mes", newMes);
    return `/inicio?${p.toString()}`;
  }
  function buildFarmerHref(updates: Record<string, string>) {
    const base: Record<string, string> = { time: "farmers", squad, origin, valor };
    if (mes !== currentMes) base.mes = mes;
    return `/inicio?${new URLSearchParams({ ...base, ...updates }).toString()}`;
  }

  const b2b    = time === "b2b"     ? await getB2BData({ mes }).catch(() => null)              : null;
  const b2c    = time === "b2c"     ? await getB2CData({ mes }).catch(() => null)              : null;
  const farmer = time === "farmers" ? await getFarmerData({ origin, mes }).catch(() => null)   : null;

  const visibleSquads = farmer
    ? (squad === "todos" ? farmer.squads : farmer.squads.filter((s) => s.id === squad))
    : [];

  const allRows = visibleSquads.flatMap((s) => s.rows);

  const raisedData  = allRows.map((r) => ({ name: r.name, value: r.raised      ?? 0 }));
  const closedData  = allRows.map((r) => ({ name: r.name, value: r.closedCount ?? 0 }));
  const revenueData = allRows.map((r) => ({
    name: r.name,
    value: valor === "liquido" ? (r.revenueLiquido ?? 0) : (r.converted ?? 0),
  }));
  const tramitaData = allRows.map((r) => ({ name: r.name, value: r.inProgress  ?? 0 }));

  const originLabel = ORIGIN_TABS.find(t => t.key === origin)?.label ?? "Ambas";

  return (
    <div>
      {/* Header + navegação de mês */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-psa), var(--font-sans)", fontSize: 22, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", margin: 0 }}>
            Inicio
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
            Visao geral de performance
          </p>
        </div>

        {/* Seletor de mês */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
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
      </div>

      {/* Tabs primárias */}
      <TabBar tabs={TIME_TABS} activeKey={time}
        buildHref={(key) => { const p = new URLSearchParams({ time: key }); if (mes !== currentMes) p.set("mes", mes); return `/inicio?${p}`; }} />

      {/* B2B */}
      {time === "b2b" && (
        b2b ? (
          <TeamBarChart
            title="Time B2B"
            subtitle={`Vendas fechadas por closer · ${mesLabel}`}
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
            subtitle={`Receita liquida por closer · ${mesLabel}`}
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
            <TabBar tabs={SQUAD_TABS} activeKey={squad}
              buildHref={(key) => buildFarmerHref({ squad: key })} sub />

            {/* Controle: Origem */}
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

            {/* 4 gráficos */}
            {allRows.length === 0 ? (
              <EmptyState label="Nenhum farmer encontrado" />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <TeamBarChart
                  title="Demandas Levantadas"
                  subtitle={`${originLabel} · Data de qualificacao · ${mesLabel}`}
                  data={raisedData}
                  color="var(--orange)"
                  metric="Demandas"
                />
                <TeamBarChart
                  title="Negocios Fechados"
                  subtitle={`${originLabel} · Fechamento no mes · ${mesLabel}`}
                  data={closedData}
                  color="var(--blue)"
                  metric="Negocios"
                />
                <TeamBarChart
                  title={`Receita Total (${valor === "liquido" ? "Liquida" : "Bruta"})`}
                  subtitle={`${originLabel} · Fechamento no mes · ${mesLabel}`}
                  data={revenueData}
                  color="var(--green)"
                  format="brl"
                  metric={valor === "liquido" ? "Receita liquida" : "Receita bruta"}
                  headerRight={
                    <div className="seg">
                      {VALOR_TABS.map((t) => (
                        <Link key={t.key} href={buildFarmerHref({ valor: t.key })}
                          className={`seg-item${valor === t.key ? " active sub" : ""}`}>
                          {t.label}
                        </Link>
                      ))}
                    </div>
                  }
                />
                <TeamBarChart
                  title="Tramitacoes em Andamento"
                  subtitle="Pipeline CS · Snapshot ao vivo"
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
