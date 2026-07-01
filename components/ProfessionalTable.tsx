"use client";

import { useState } from "react";

export type Vertical = "b2b" | "b2c" | "farmer";

export interface ProfRow {
  id: string;
  name: string;
  email: string;
  meetings?: number;
  deals?: number;
  revenue?: number;
  inNegotiation?: number;
  products?: string[];
  raised?: number;
  inProgress?: number;
  converted?: number;      // receita bruta dos negócios fechados
  closedCount?: number;    // quantidade de negócios fechados
  revenueLiquido?: number; // receita líquida dos negócios fechados
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

function fmtRevenue(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

const COLS: Record<Vertical, { key: keyof ProfRow; label: string; mono?: boolean; lead?: boolean }[]> = {
  b2b: [
    { key: "name",          label: "Closer" },
    { key: "meetings",      label: "Reuniões realizadas", mono: true },
    { key: "deals",         label: "Vendas fechadas",     mono: true },
    { key: "revenue",       label: "Receita líquida",     mono: true, lead: true },
    { key: "inNegotiation", label: "Em negociação",       mono: true },
  ],
  b2c: [
    { key: "name",     label: "Closer" },
    { key: "deals",    label: "Vendas",          mono: true },
    { key: "revenue",  label: "Receita líquida", mono: true, lead: true },
    { key: "meetings", label: "Reuniões",         mono: true },
    { key: "products", label: "Produtos" },
  ],
  farmer: [
    { key: "name",       label: "Farmer" },
    { key: "meetings",   label: "Reuniões agend.",      mono: true },
    { key: "inProgress", label: "Em tramitação",        mono: true },
    { key: "raised",     label: "Demandas levantadas",  mono: true },
    { key: "converted",  label: "Convertidas (R$)",     mono: true, lead: true },
  ],
};

function fmtCell(v: unknown, key: keyof ProfRow): string {
  if (v === undefined || v === null) return "—";
  if ((key === "revenue" || key === "converted") && typeof v === "number") return fmtRevenue(v);
  if (key === "products" && Array.isArray(v)) return v.length ? v.join(", ") : "—";
  return String(v);
}

export default function ProfessionalTable({ rows, vertical }: { rows: ProfRow[]; vertical: Vertical }) {
  const [search, setSearch] = useState("");
  const cols = COLS[vertical];
  const filtered = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="title">Profissionais</div>
          <div className="cap">{rows.length} membro{rows.length !== 1 ? "s" : ""} no time</div>
        </div>
      </div>

      <div className="tbar">
        <input
          className="inp"
          type="text"
          placeholder="Buscar profissional..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="tcount">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">Nenhum profissional encontrado.</div>
      ) : (
        <div className="tablewrap">
          <div className="tscroll">
            <table className="tbl">
              <thead>
                <tr>
                  {cols.map((c) => (
                    <th key={String(c.key)}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="row">
                    {cols.map((c) => (
                      <td key={String(c.key)}>
                        {c.key === "name" ? (
                          <div className="name-cell">
                            <span className="av">{initials(row.name)}</span>
                            <span className="nm">{row.name}</span>
                          </div>
                        ) : (
                          <span className={`${c.mono ? "mono" : ""} ${c.lead ? "accent" : ""}`}>
                            {fmtCell(row[c.key], c.key)}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
