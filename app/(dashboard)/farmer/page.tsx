import KpiCard from "@/components/KpiCard";
import FarmerTable from "@/components/FarmerTable";
import { getFarmerData } from "@/lib/hubspot/farmer";

export const dynamic = "force-dynamic";

export default async function FarmerPage() {
  const data = await getFarmerData();
  const converted = `R$ ${data.totals.converted.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <div>
      <div className="kpis">
        <KpiCard label="Reuniões agendadas"     value={data.totals.meetings} />
        <KpiCard label="Demandas em tramitação" value={data.totals.inProgress} />
        <KpiCard label="Demandas levantadas"    value={data.totals.raised} />
        <KpiCard label="Convertidas em vendas"  value={converted} lead />
      </div>
      <FarmerTable squads={data.squads} />
    </div>
  );
}
