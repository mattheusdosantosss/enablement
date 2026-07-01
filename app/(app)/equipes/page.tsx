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

const SQUAD_TABS = [
  { key: "todos",    label: "Todos os Squads" },
  { key: "dani",     label: "Squad Dani"      },
  { key: "katyeli",  label: "Squad Katyeli"   },
  { key: "leticia",  label: "Squad Leticia"   },
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
          <Link
            key={tab.key}
            href={buildHref(tab.key)}
            className={`seg-item${active ? ` active${sub ? " sub" : ""}` : ""}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

export default async function EquipesPage({
  searchParams,
}: {
  searchParams: { time?: string; squad?: string };
}) {
  const time  = (searchParams.time  ?? "b2b")   as "b2b" | "b2c" | "farmers";
  const squad = (searchParams.squad ?? "todos");

  const b2b    = time === "b2b"     ? await getB2BData().catch(() => null)    : null;
  const b2c    = time === "b2c"     ? await getB2CData().catch(() => null)    : null;
  const farmer = time === "farmers" ? await getFarmerData().catch(() => null) : null;

  // Filtra squads se selecionado
  const visibleSquads = farmer
    ? (squad === "todos" ? farmer.squads : farmer.squads.filter((s) => s.id === squad))
    : [];

  const squadTotals = visibleSquads.length
    ? {
        meetings:   visibleSquads.flatMap((s) => s.rows).reduce((a, r) => a + (r.meetings   ?? 0), 0),
        inProgress: visibleSquads.flatMap((s) => s.rows).reduce((a, r) => a + (r.inProgress ?? 0), 0),
        raised:     visibleSquads.flatMap((s) => s.rows).reduce((a, r) => a + (r.raised     ?? 0), 0),
        converted:  visibleSquads.flatMap((s) => s.rows).reduce((a, r) => a + (r.converted  ?? 0), 0),
      }
    : farmer?.totals ?? { meetings: 0, inProgress: 0, raised: 0, converted: 0 };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "var(--font-psa), var(--font-sans)", fontSize: 22, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", margin: 0 }}>
          Equipes
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
          Performance individual por time - mes atual
        </p>
      </div>

      {/* Tabs primárias — times */}
      <TabBar
        tabs={TABS}
        activeKey={time}
        buildHref={(key) => `/equipes?time=${key}`}
      />

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
            {/* Tabs secundárias — squads */}
            <TabBar
              tabs={SQUAD_TABS}
              activeKey={squad}
              buildHref={(key) => `/equipes?time=farmers&squad=${key}`}
              sub
            />

            {/* KPIs do squad selecionado */}
            <div className="kpis" style={{ marginBottom: 18 }}>
              <KpiCard label="Reuniões agendadas"    value={squadTotals.meetings} />
              <KpiCard label="Em tramitação"         value={squadTotals.inProgress} />
              <KpiCard label="Demandas levantadas"   value={squadTotals.raised} />
              <KpiCard label="Convertidas em vendas" value={fmt(squadTotals.converted)} lead />
            </div>

            <FarmerTable squads={visibleSquads} />
          </>
        ) : <p style={{ color: "var(--muted)", fontSize: 13 }}>Não foi possível carregar os dados.</p>
      )}
    </div>
  );
}
