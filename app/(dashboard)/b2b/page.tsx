import KpiCard from "@/components/KpiCard";
import ProfessionalTable from "@/components/ProfessionalTable";
import { getB2BData } from "@/lib/hubspot/b2b";

export const revalidate = 300;

export default async function B2BPage() {
  const data = await getB2BData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-brand-text">Closers B2B</h1>
        <p className="text-sm text-brand-muted mt-0.5">Performance do time — mês atual</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Reuniões realizadas" value={data.totals.meetings} />
        <KpiCard label="Vendas fechadas" value={data.totals.deals} />
        <KpiCard
          label="Receita líquida"
          value={`R$ ${data.totals.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
          highlight
        />
        <KpiCard label="Em negociação" value={data.totals.inNegotiation} />
      </div>

      <ProfessionalTable rows={data.rows} vertical="b2b" />
    </div>
  );
}
