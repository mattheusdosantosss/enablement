import KpiCard from "@/components/KpiCard";
import ProfessionalTable from "@/components/ProfessionalTable";
import { getB2CData } from "@/lib/hubspot/b2c";

export const dynamic = "force-dynamic";

export default async function B2CPage() {
  const data = await getB2CData();
  const revenue = `R$ ${data.totals.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <div>
      <div className="kpis">
        <KpiCard label="Vendas no mês"   value={data.totals.deals} />
        <KpiCard label="Receita líquida" value={revenue} lead />
        <KpiCard label="Reuniões"        value={data.totals.meetings} />
        <KpiCard label="Produtos vendidos" value={data.totals.products} sub="tipos únicos" />
      </div>
      <ProfessionalTable rows={data.rows} vertical="b2c" />
    </div>
  );
}
