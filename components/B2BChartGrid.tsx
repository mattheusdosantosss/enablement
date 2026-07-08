"use client";

import nextDynamic from "next/dynamic";
import Link from "next/link";

const TeamBarChart = nextDynamic(() => import("./TeamBarChart"), { ssr: false });

export interface B2BBarEntry { name: string; value: number; }

interface Props {
  meetingsData: B2BBarEntry[];
  dealsData:    B2BBarEntry[];
  revenueData:  B2BBarEntry[];
  valor:        "bruto" | "liquido";
  period:       string;
  periodLabel:  string;
  totals:       { meetings: number; deals: number; revenue: number };
}

const VALOR_TABS = [
  { key: "bruto",   label: "Bruto"   },
  { key: "liquido", label: "Líquido" },
];

function fmtBrl(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
}

function KpiTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      flex: 1, padding: "16px 22px",
      background: "var(--s2)", border: "1px solid var(--border)", borderRadius: 12,
    }}>
      <div style={{ fontSize: 10, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "var(--font-psa), var(--font-mono)", marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}

export default function B2BChartGrid({
  meetingsData, dealsData, revenueData, valor, period, periodLabel, totals,
}: Props) {

  function buildHref(updates: Record<string, string>) {
    return `/inicio?${new URLSearchParams({ time: "b2b", period, valor, ...updates })}`;
  }

  const valorToggle = (
    <div className="seg">
      {VALOR_TABS.map((t) => (
        <Link key={t.key} href={buildHref({ valor: t.key })}
          className={`seg-item${valor === t.key ? " active sub" : ""}`}>
          {t.label}
        </Link>
      ))}
    </div>
  );

  const revenueLabel = valor === "liquido" ? "Líquida" : "Bruta";

  return (
    <>
      {/* KPI tiles */}
      <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
        <KpiTile label="Reuniões realizadas" value={String(totals.meetings)} color="var(--orange)" />
        <KpiTile label="Negócios fechados"   value={String(totals.deals)}   color="var(--blue)"   />
        <KpiTile label={`Receita ${revenueLabel}`} value={fmtBrl(totals.revenue)} color="var(--green)" />
      </div>

      {/* Gráficos */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <TeamBarChart
          title="Reuniões Realizadas"
          subtitle={`Resultado da reunião: Concluído · ${periodLabel}`}
          data={meetingsData}
          color="var(--orange)"
          metric="Reuniões"
        />
        <TeamBarChart
          title="Negócios Fechados"
          subtitle={`Funil de Vendas B2B · ${periodLabel}`}
          data={dealsData}
          color="var(--blue)"
          metric="Negócios"
        />
        <TeamBarChart
          title={`Receita ${revenueLabel}`}
          subtitle={`Funil de Vendas B2B · Amount · ${periodLabel}`}
          data={revenueData}
          color="var(--green)"
          format="brl"
          metric={`Receita ${revenueLabel}`}
          headerRight={valorToggle}
        />
      </div>
    </>
  );
}
