import nextDynamic from "next/dynamic";
import { getB2BData } from "@/lib/hubspot/b2b";
import { getB2CData } from "@/lib/hubspot/b2c";
import { getFarmerData } from "@/lib/hubspot/farmer";

export const dynamic = "force-dynamic";

const TeamBarChart = nextDynamic(() => import("@/components/TeamBarChart"), { ssr: false });

export default async function InicioPage() {
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

  const b2bChart = b2b.rows.map((r) => ({ name: r.name, value: r.deals ?? 0 }));
  const b2cChart = b2c.rows.map((r) => ({ name: r.name, value: r.revenue ?? 0 }));
  const farmerChart = farmer.rows.map((r) => ({ name: r.name, value: r.raised ?? 0 }));

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: "var(--font-psa), var(--font-sans)", fontSize: 22, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", margin: 0 }}>
          Início
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
          Visão geral de performance — mês atual
        </p>
      </div>

      <div style={{ display: "grid", gap: 18 }}>
        <TeamBarChart
          title="Time B2B"
          subtitle="Vendas fechadas por closer"
          data={b2bChart}
          color="var(--accent)"
          metric="Vendas"
        />

        <TeamBarChart
          title="Time B2C"
          subtitle="Receita líquida por closer"
          data={b2cChart}
          color="var(--blue)"
          format="brl"
          metric="Receita líquida"
        />

        <TeamBarChart
          title="Farmers"
          subtitle="Demandas levantadas por farmer"
          data={farmerChart}
          color="var(--green)"
          metric="Demandas levantadas"
        />
      </div>
    </div>
  );
}
