import KpiCard from "@/components/KpiCard";
import ProfessionalTable from "@/components/ProfessionalTable";
import { getB2BData } from "@/lib/hubspot/b2b";

export const dynamic = "force-dynamic";

export default async function B2BPage() {
  const data = await getB2BData();
  const revenue = `R$ ${data.totals.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <div>
      <div className="kpis">
        <KpiCard label="Reuniões realizadas"  value={data.totals.meetings} />
        <KpiCard label="Vendas fechadas"       value={data.totals.deals} />
        <KpiCard label="Receita líquida"       value={revenue} lead />
        <KpiCard label="Em negociação"         value={data.totals.inNegotiation} />
      </div>
      <ProfessionalTable rows={data.rows} vertical="b2b" />
    </div>
  );
}
