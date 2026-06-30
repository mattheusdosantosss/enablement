import KpiCard from "@/components/KpiCard";
import ProfessionalTable from "@/components/ProfessionalTable";
import FarmerTable from "@/components/FarmerTable";
import { getB2BData } from "@/lib/hubspot/b2b";
import { getB2CData } from "@/lib/hubspot/b2c";
import { getFarmerData } from "@/lib/hubspot/farmer";

export const dynamic = "force-dynamic";

function fmt(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
}

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontFamily: "var(--font-psa), var(--font-sans)", fontSize: 18, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", margin: 0 }}>
        {title}
      </h2>
      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{sub}</p>
    </div>
  );
}

export default async function EquipesPage() {
  const [b2b, b2c, farmer] = await Promise.all([
    getB2BData().catch(() => null),
    getB2CData().catch(() => null),
    getFarmerData().catch(() => null),
  ]);

  if (!b2b || !b2c || !farmer) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted)" }}>
        <p style={{ fontSize: 14 }}>Não foi possível carregar os dados. Verifique o token HubSpot.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
      <div style={{ marginBottom: 4 }}>
        <h2 style={{ fontFamily: "var(--font-psa), var(--font-sans)", fontSize: 22, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", margin: 0 }}>
          Equipes
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
          Performance individual por time — mês atual
        </p>
      </div>

      {/* B2B */}
      <section>
        <SectionHeader title="Closers B2B" sub="Performance individual do time de vendas B2B" />
        <div className="kpis" style={{ marginBottom: 18 }}>
          <KpiCard label="Reuniões realizadas" value={b2b.totals.meetings} />
          <KpiCard label="Vendas fechadas"      value={b2b.totals.deals} />
          <KpiCard label="Receita líquida"      value={fmt(b2b.totals.revenue)} lead />
          <KpiCard label="Em negociação"        value={b2b.totals.inNegotiation} />
        </div>
        <ProfessionalTable rows={b2b.rows} vertical="b2b" />
      </section>

      <hr className="hr" />

      {/* B2C */}
      <section>
        <SectionHeader title="Closers B2C" sub="Performance individual do time de vendas B2C" />
        <div className="kpis" style={{ marginBottom: 18 }}>
          <KpiCard label="Vendas no mês"      value={b2c.totals.deals} />
          <KpiCard label="Receita líquida"    value={fmt(b2c.totals.revenue)} lead />
          <KpiCard label="Reuniões"           value={b2c.totals.meetings} />
          <KpiCard label="Produtos vendidos"  value={b2c.totals.products} sub="tipos únicos" />
        </div>
        <ProfessionalTable rows={b2c.rows} vertical="b2c" />
      </section>

      <hr className="hr" />

      {/* Farmers */}
      <section>
        <SectionHeader title="Farmers" sub="Performance por squad — Dani · Katyeli · Leticia" />
        <div className="kpis" style={{ marginBottom: 18 }}>
          <KpiCard label="Reuniões agendadas"     value={farmer.totals.meetings} />
          <KpiCard label="Em tramitação"          value={farmer.totals.inProgress} />
          <KpiCard label="Demandas levantadas"    value={farmer.totals.raised} />
          <KpiCard label="Convertidas em vendas"  value={fmt(farmer.totals.converted)} lead />
        </div>
        <FarmerTable squads={farmer.squads} />
      </section>
    </div>
  );
}
