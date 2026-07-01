import nextDynamic from "next/dynamic";
import { getB2BData } from "@/lib/hubspot/b2b";
import { getB2CData } from "@/lib/hubspot/b2c";
import { getFarmerData } from "@/lib/hubspot/farmer";
import Link from "next/link";

export const dynamic = "force-dynamic";

const TeamBarChart = nextDynamic(() => import("@/components/TeamBarChart"), { ssr: false });

const TIME_TABS = [
  { key: "b2b",     label: "Closers B2B" },
  { key: "b2c",     label: "Closers B2C" },
  { key: "farmers", label: "Farmers"     },
];

const SQUAD_TABS = [
  { key: "todos",   label: "Todos"          },
  { key: "dani",    label: "Squad Dani"     },
  { key: "katyeli", label: "Squad Katyeli"  },
  { key: "leticia", label: "Squad Leticia"  },
];

function TabBar({ tabs, activeKey, buildHref, secondary }: {
  tabs: { key: string; label: string }[];
  activeKey: string;
  buildHref: (key: string) => string;
  secondary?: boolean;
}) {
  return (
    <div style={{
      display: "flex", gap: 4,
      borderBottom: `1px solid var(--border-soft)`,
      marginBottom: secondary ? 20 : 24,
    }}>
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <Link
            key={tab.key}
            href={buildHref(tab.key)}
            style={{
              display: "inline-block",
              padding: secondary ? "7px 14px" : "9px 20px",
              fontFamily: "var(--font-psa), var(--font-sans)",
              fontSize: secondary ? 11 : 12,
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
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="card">
      <div className="empty">{label}</div>
    </div>
  );
}

export default async function InicioPage({
  searchParams,
}: {
  searchParams: { time?: string; squad?: string };
}) {
  const time  = (searchParams.time  ?? "b2b") as "b2b" | "b2c" | "farmers";
  const squad = searchParams.squad ?? "todos";

  const b2b    = time === "b2b"     ? await getB2BData().catch(() => null)    : null;
  const b2c    = time === "b2c"     ? await getB2CData().catch(() => null)    : null;
  const farmer = time === "farmers" ? await getFarmerData().catch(() => null) : null;

  const visibleSquads = farmer
    ? (squad === "todos" ? farmer.squads : farmer.squads.filter((s) => s.id === squad))
    : [];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "var(--font-psa), var(--font-sans)", fontSize: 22, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", margin: 0 }}>
          Inicio
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
          Visao geral de performance - mes atual
        </p>
      </div>

      <TabBar
        tabs={TIME_TABS}
        activeKey={time}
        buildHref={(key) => `/inicio?time=${key}`}
      />

      {/* B2B */}
      {time === "b2b" && (
        b2b ? (
          <TeamBarChart
            title="Time B2B"
            subtitle="Vendas fechadas por closer"
            data={b2b.rows.map((r) => ({ name: r.name, value: r.deals ?? 0 }))}
            color="var(--accent)"
            metric="Vendas"
          />
        ) : <EmptyState label="Sem dados para o time B2B" />
      )}

      {/* B2C */}
      {time === "b2c" && (
        b2c ? (
          <TeamBarChart
            title="Time B2C"
            subtitle="Receita liquida por closer"
            data={b2c.rows.map((r) => ({ name: r.name, value: r.revenue ?? 0 }))}
            color="var(--blue)"
            format="brl"
            metric="Receita liquida"
          />
        ) : <EmptyState label="Sem dados para o time B2C" />
      )}

      {/* Farmers */}
      {time === "farmers" && (
        farmer ? (
          <>
            <TabBar
              tabs={SQUAD_TABS}
              activeKey={squad}
              buildHref={(key) => `/inicio?time=farmers&squad=${key}`}
              secondary
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {visibleSquads.map((sq) => (
                <TeamBarChart
                  key={sq.id}
                  title={sq.label}
                  subtitle="Demandas levantadas por farmer"
                  data={sq.rows.map((r) => ({ name: r.name, value: r.raised ?? 0 }))}
                  color="var(--green)"
                  metric="Demandas levantadas"
                />
              ))}
              {visibleSquads.length === 0 && (
                <EmptyState label="Nenhum squad encontrado" />
              )}
            </div>
          </>
        ) : <EmptyState label="Sem dados para o time Farmers" />
      )}
    </div>
  );
}
