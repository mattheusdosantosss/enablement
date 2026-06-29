"use client";

import { useState } from "react";

export type Vertical = "b2b" | "b2c" | "farmer";

export interface ProfRow {
  id: string;
  name: string;
  email: string;
  // B2B
  meetings?: number;
  deals?: number;
  revenue?: number;
  inNegotiation?: number;
  // B2C extra
  products?: string[];
  // Farmer extra
  raised?: number;
  inProgress?: number;
  converted?: number;
}

const COLS: Record<Vertical, { key: keyof ProfRow; label: string; mono?: boolean }[]> = {
  b2b: [
    { key: "name", label: "Closer" },
    { key: "meetings", label: "Reuniões", mono: true },
    { key: "deals", label: "Vendas", mono: true },
    { key: "revenue", label: "Receita líquida", mono: true },
    { key: "inNegotiation", label: "Em negociação", mono: true },
  ],
  b2c: [
    { key: "name", label: "Closer" },
    { key: "deals", label: "Vendas", mono: true },
    { key: "revenue", label: "Receita líquida", mono: true },
    { key: "meetings", label: "Reuniões", mono: true },
    { key: "products", label: "Produtos" },
  ],
  farmer: [
    { key: "name", label: "Farmer" },
    { key: "meetings", label: "Reuniões agend.", mono: true },
    { key: "inProgress", label: "Em tramitação", mono: true },
    { key: "raised", label: "Demandas levantadas", mono: true },
    { key: "converted", label: "Convertidas (R$)", mono: true },
  ],
};

function fmt(v: unknown, key: keyof ProfRow): string {
  if (v === undefined || v === null) return "—";
  if (key === "revenue" || key === "converted") {
    return `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
  }
  if (key === "products" && Array.isArray(v)) {
    return v.join(", ") || "—";
  }
  return String(v);
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export default function ProfessionalTable({
  rows,
  vertical,
}: {
  rows: ProfRow[];
  vertical: Vertical;
}) {
  const [search, setSearch] = useState("");
  const cols = COLS[vertical];

  const filtered = rows.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!rows.length) {
    return (
      <div className="bg-brand-surface border border-brand-border rounded-lg p-8 text-center text-brand-muted text-sm">
        Nenhum profissional encontrado para este setor.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Buscar profissional..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="bg-brand-surface border border-brand-border rounded px-3 py-1.5 text-sm text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-orange w-64"
      />

      <div className="overflow-x-auto rounded-lg border border-brand-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border bg-brand-surface">
              {cols.map((c) => (
                <th
                  key={c.key}
                  className="px-4 py-3 text-left text-xs text-brand-muted uppercase tracking-wider font-medium"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr
                key={row.id}
                className={`border-b border-brand-border last:border-0 hover:bg-white/[0.02] transition-colors ${
                  i % 2 === 0 ? "bg-brand-bg" : "bg-brand-surface/40"
                }`}
              >
                {cols.map((c) => (
                  <td key={c.key} className="px-4 py-3">
                    {c.key === "name" ? (
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-brand-orange/20 text-brand-orange text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {initials(row.name)}
                        </span>
                        <span className="font-medium text-brand-text">{row.name}</span>
                      </div>
                    ) : (
                      <span className={c.mono ? "font-mono text-brand-text" : "text-brand-text"}>
                        {fmt(row[c.key], c.key)}
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
  );
}
