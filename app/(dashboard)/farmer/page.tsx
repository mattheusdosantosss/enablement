import KpiCard from "@/components/KpiCard";
import ProfessionalTable from "@/components/ProfessionalTable";
import { getFarmerData } from "@/lib/hubspot/farmer";

export const revalidate = 300;

export default async function FarmerPage() {
  const data = await getFarmerData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-brand-text">Farmers</h1>
        <p className="text-sm text-brand-muted mt-0.5">Performance do time — mês atual</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Reuniões agendadas" value={data.totals.meetings} />
        <KpiCard label="Demandas em tramitação" value={data.totals.inProgress} />
        <KpiCard label="Demandas levantadas" value={data.totals.raised} />
        <KpiCard
          label="Convertidas em vendas"
          value={`R$ ${data.totals.converted.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
          highlight
        />
      </div>

      <ProfessionalTable rows={data.rows} vertical="farmer" />
    </div>
  );
}
