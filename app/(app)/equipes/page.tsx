import KpiCard from "@/components/KpiCard";
import ProfessionalTable from "@/components/ProfessionalTable";
import FarmerTable from "@/components/FarmerTable";
import { getB2BData } from "@/lib/hubspot/b2b";
import { getB2CData } from "@/lib/hubspot/b2c";
import { getFarmerData } from "@/lib/hubspot/farmer";
import Link from "next/link";

export const dynamic = "force-dynamic";

function fmt(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
}

const TABS = [
  { key: "b2b",     label: "Closers B2B" },
  { key: "b2c",     label: "Closers B2C" },
  { key: "farmers", label: "Farmers"     },
];

export default async function EquipesPage({
  searchParams,
}: {
  searchParams: { time?: string };
}) {
  const time = (searchParams.time ?? "b2b") as "b2b" | "b2c" | "farmers";

  const b2b     = time === "b2b"     ? await getB2BData().catch(() => null)     : null;
  const b2c     = time === "b2c"     ? await getB2CData().catch(() => null)     : null;
  const farmer  = time === "farmers" ? await getFarmerData().catch(() => null)  : null;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "var(--font-psa), var(--font-sans)", fontSize: 22, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", margin: 0 }}>
          Equipes
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
          Performance individual por time — mês atual
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 32, borderBottom: "1px solid var(--border-soft)", paddingBottom: 0 }}>
        {TABS.map((tab) => {
          const active = tab.key === time;
          return (
            <Link
              key={tab.key}
              href={`/equipes?time=${tab.key}`}
              style={{
                display: "inline-block",
                padding: "9px 20px",
                fontFamily: "var(--font-psa), var(--font-sans)",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                textDecoration: "none",
                borderRadius: "10px 10px 0 0",
                color: active ? "var(--accent)" : "var(--muted)",
                background: active ? "var(--accent-soft)" : "transparent",
                borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                transition: "all .15s",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* B2B */}
      {time === "b2b" && (
        b2b ? (
          <>
            <div className="kpis" style={{ marginBottom: 18 }}>
              <KpiCard label="Reuniões realizadas" value={b2b.totals.meetings} />
              <KpiCard label="Vendas fechadas"      value={b2b.totals.deals} />
              <KpiCard label="Receita líquida"      value={fmt(b2b.totals.revenue)} lead />
              <KpiCard label="Em negociação"        value={b2b.totals.inNegotiation} />
            </div>
            <ProfessionalTable rows={b2b.rows} vertical="b2b" />
          </>
        ) : <p style={{ color: "var(--muted)", fontSize: 13 }}>Não foi possível carregar os dados.</p>
      )}

      {/* B2C */}
      {time === "b2c" && (
        b2c ? (
          <>
            <div className="kpis" style={{ marginBottom: 18 }}>
              <KpiCard label="Vendas no mês"      value={b2c.totals.deals} />
              <KpiCard label="Receita líquida"    value={fmt(b2c.totals.revenue)} lead />
              <KpiCard label="Reuniões"           value={b2c.totals.meetings} />
              <KpiCard label="Produtos vendidos"  value={b2c.totals.products} sub="tipos únicos" />
            </div>
            <ProfessionalTable rows={b2c.rows} vertical="b2c" />
          </>
        ) : <p style={{ color: "var(--muted)", fontSize: 13 }}>Não foi possível carregar os dados.</p>
      )}

      {/* Farmers */}
      {time === "farmers" && (
        farmer ? (
          <>
            <div className="kpis" style={{ marginBottom: 18 }}>
              <KpiCard label="Reuniões agendadas"     value={farmer.totals.meetings} />
              <KpiCard label="Em tramitação"          value={farmer.totals.inProgress} />
              <KpiCard label="Demandas levantadas"    value={farmer.totals.raised} />
              <KpiCard label="Convertidas em vendas"  value={fmt(farmer.totals.converted)} lead />
            </div>
            <FarmerTable squads={farmer.squads} />
          </>
        ) : <p style={{ color: "var(--muted)", fontSize: 13 }}>Não foi possível carregar os dados.</p>
      )}
    </div>
  );
}
