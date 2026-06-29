"use client";

import { useState } from "react";
import type { ProfRow } from "./ProfessionalTable";

export interface FarmerSquadGroup {
  id: string;
  label: string;
  rows: ProfRow[];
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function fmtRevenue(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
}

function SquadSubtotals({ rows }: { rows: ProfRow[] }) {
  const meetings   = rows.reduce((s, r) => s + (r.meetings ?? 0), 0);
  const inProgress = rows.reduce((s, r) => s + (r.inProgress ?? 0), 0);
  const raised     = rows.reduce((s, r) => s + (r.raised ?? 0), 0);
  const converted  = rows.reduce((s, r) => s + (r.converted ?? 0), 0);

  return (
    <tr className="bg-brand-orange/5 border-b border-brand-border">
      <td className="px-4 py-2 text-xs text-brand-muted font-medium uppercase tracking-wider pl-12">
        Total do squad
      </td>
      <td className="px-4 py-2 font-mono text-sm font-semibold text-brand-text">{meetings}</td>
      <td className="px-4 py-2 font-mono text-sm font-semibold text-brand-text">{inProgress}</td>
      <td className="px-4 py-2 font-mono text-sm font-semibold text-brand-text">{raised}</td>
      <td className="px-4 py-2 font-mono text-sm font-semibold text-brand-orange">{fmtRevenue(converted)}</td>
    </tr>
  );
}

export default function FarmerTable({ squads }: { squads: FarmerSquadGroup[] }) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const filtered = squads.map((s) => ({
    ...s,
    rows: s.rows.filter((r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase())
    ),
  }));

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Buscar farmer..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="bg-brand-surface border border-brand-border rounded px-3 py-1.5 text-sm text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-orange w-64"
      />

      <div className="space-y-4">
        {filtered.map((squad) => {
          const isCollapsed = collapsed.has(squad.id);
          return (
            <div key={squad.id} className="rounded-lg border border-brand-border overflow-hidden">
              {/* Squad header */}
              <button
                onClick={() => toggle(squad.id)}
                className="w-full flex items-center justify-between px-4 py-3 bg-brand-surface hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-brand-orange" />
                  <span className="font-semibold text-brand-text text-sm">{squad.label}</span>
                  <span className="text-xs text-brand-muted font-mono">
                    {squad.rows.length} farmer{squad.rows.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <svg
                  className={`w-4 h-4 text-brand-muted transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {!isCollapsed && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-b border-brand-border bg-brand-bg">
                      <th className="px-4 py-2.5 text-left text-xs text-brand-muted uppercase tracking-wider">Farmer</th>
                      <th className="px-4 py-2.5 text-left text-xs text-brand-muted uppercase tracking-wider">Reuniões agend.</th>
                      <th className="px-4 py-2.5 text-left text-xs text-brand-muted uppercase tracking-wider">Em tramitação</th>
                      <th className="px-4 py-2.5 text-left text-xs text-brand-muted uppercase tracking-wider">Demandas levantadas</th>
                      <th className="px-4 py-2.5 text-left text-xs text-brand-muted uppercase tracking-wider">Convertidas (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {squad.rows.map((row, i) => (
                      <tr
                        key={row.id}
                        className={`border-b border-brand-border last:border-0 hover:bg-white/[0.02] transition-colors ${
                          i % 2 === 0 ? "bg-brand-bg" : "bg-brand-surface/30"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-brand-orange/20 text-brand-orange text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {initials(row.name)}
                            </span>
                            <span className="font-medium text-brand-text">{row.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-brand-text">{row.meetings ?? 0}</td>
                        <td className="px-4 py-3 font-mono text-brand-text">{row.inProgress ?? 0}</td>
                        <td className="px-4 py-3 font-mono text-brand-text">{row.raised ?? 0}</td>
                        <td className="px-4 py-3 font-mono text-brand-text">
                          {fmtRevenue(row.converted ?? 0)}
                        </td>
                      </tr>
                    ))}
                    <SquadSubtotals rows={squad.rows} />
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
