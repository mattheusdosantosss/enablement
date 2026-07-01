"use client";

import nextDynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import FarmerDealsModal from "./FarmerDealsModal";

const TeamBarChart = nextDynamic(() => import("./TeamBarChart"), { ssr: false });

const VALOR_TABS = [
  { key: "bruto",   label: "Bruto"   },
  { key: "liquido", label: "Líquido" },
];

export interface FarmersBarEntry { name: string; value: number; id: string; }

interface Props {
  raisedData:   FarmersBarEntry[];
  closedData:   FarmersBarEntry[];
  revenueData:  FarmersBarEntry[];
  tramitaData:  FarmersBarEntry[];
  valor:        "bruto" | "liquido";
  origin:       string;
  mes:          string;
  squad:        string;
  currentMes:   string;
  mesLabel:     string;
  originLabel:  string;
}

export default function FarmersChartGrid({
  raisedData, closedData, revenueData, tramitaData,
  valor, origin, mes, squad, currentMes, mesLabel, originLabel,
}: Props) {
  const [modal, setModal] = useState<{ ownerId: string; name: string; type: "raised" | "converted" } | null>(null);

  function buildHref(updates: Record<string, string>) {
    const base: Record<string, string> = { time: "farmers", squad, origin, valor };
    if (mes !== currentMes) base.mes = mes;
    return `/inicio?${new URLSearchParams({ ...base, ...updates })}`;
  }

  const valorToggle = (
    <div className="seg">
      {VALOR_TABS.map((t) => (
        <Link key={t.key} href={buildHref({ valor: t.key })}
          className={`seg-item${valor === t.key ? " active sub" : ""}`}>
          {t.label}
        </Link>
      ))}
    </div>
  );

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <TeamBarChart
          title="Demandas Levantadas"
          subtitle={`${originLabel} · Data de qualificacao · ${mesLabel}`}
          data={raisedData}
          color="var(--orange)"
          metric="Demandas"
          onBarClick={(e) => setModal({ ownerId: e.id ?? "", name: e.name, type: "raised" })}
        />
        <TeamBarChart
          title="Negocios Fechados"
          subtitle={`${originLabel} · Fechamento no mes · ${mesLabel}`}
          data={closedData}
          color="var(--blue)"
          metric="Negocios"
          onBarClick={(e) => setModal({ ownerId: e.id ?? "", name: e.name, type: "converted" })}
        />
        <TeamBarChart
          title={`Receita Total (${valor === "liquido" ? "Liquida" : "Bruta"})`}
          subtitle={`${originLabel} · Fechamento no mes · ${mesLabel}`}
          data={revenueData}
          color="var(--green)"
          format="brl"
          metric={valor === "liquido" ? "Receita Liquida" : "Receita Bruta"}
          headerRight={valorToggle}
        />
        <TeamBarChart
          title="Tramitacoes em Andamento"
          subtitle="Pipeline CS · Snapshot ao vivo"
          data={tramitaData}
          color="var(--accent)"
          metric="Tramitacoes"
        />
      </div>

      {modal && modal.ownerId && (
        <FarmerDealsModal
          ownerId={modal.ownerId}
          name={modal.name}
          type={modal.type}
          mes={mes}
          origin={origin}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
