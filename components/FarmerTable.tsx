"use client";

import { useState } from "react";
import type { ProfRow } from "./ProfessionalTable";

export interface FarmerSquadGroup {
  id: string;
  label: string;
  rows: ProfRow[];
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

function fmtRevenue(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function SubtotalRow({ rows }: { rows: ProfRow[] }) {
  const meetings   = rows.reduce((s, r) => s + (r.meetings ?? 0), 0);
  const inProgress = rows.reduce((s, r) => s + (r.inProgress ?? 0), 0);
  const raised     = rows.reduce((s, r) => s + (r.raised ?? 0), 0);
  const converted  = rows.reduce((s, r) => s + (r.converted ?? 0), 0);

  return (
    <tr className="subtotal">
      <td>Total do squad</td>
      <td><span className="num mono">{meetings}</span></td>
      <td><span className="num mono">{inProgress}</span></td>
      <td><span className="num mono">{raised}</span></td>
      <td><span className="num mono accent">{fmtRevenue(converted)}</span></td>
    </tr>
  );
}

function SquadSection({ squad, search }: { squad: FarmerSquadGroup; search: string }) {
  const [open, setOpen] = useState(true);

  const filtered = squad.rows.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase())
  );

  if (search && filtered.length === 0) return null;

  return (
    <>
      <tr>
        <td colSpan={5} style={{ padding: 0 }}>
          <button
            className={`squad-collapse-btn${open ? " open" : ""}`}
            onClick={() => setOpen((o) => !o)}
          >
            <span>
              <span className="squad-dot" style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", marginRight: 8 }} />
              {squad.label}
              <span className="pill" style={{ marginLeft: 10 }}>{squad.rows.length}</span>
            </span>
            <span className="chevron">▾</span>
          </button>
        </td>
      </tr>

      {open && (
        <>
          {filtered.map((row) => (
            <tr key={row.id} className="row">
              <td>
                <div className="name-cell">
                  <span className="av">{initials(row.name)}</span>
                  <span className="nm">{row.name}</span>
                </div>
              </td>
              <td><span className="mono">{row.meetings ?? 0}</span></td>
              <td><span className="mono">{row.inProgress ?? 0}</span></td>
              <td><span className="mono">{row.raised ?? 0}</span></td>
              <td><span className="mono accent">{fmtRevenue(row.converted ?? 0)}</span></td>
            </tr>
          ))}
          <SubtotalRow rows={filtered.length ? filtered : squad.rows} />
        </>
      )}
    </>
  );
}

export default function FarmerTable({ squads }: { squads: FarmerSquadGroup[] }) {
  const [search, setSearch] = useState("");
  const total = squads.reduce((s, sq) => s + sq.rows.length, 0);

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="title">Farmers por Squad</div>
          <div className="cap">{total} farmers em 3 squads</div>
        </div>
      </div>

      <div className="tbar">
        <input
          className="inp"
          type="text"
          placeholder="Buscar farmer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="tcount">{total} farmers</span>
      </div>

      <div className="tablewrap">
        <div className="tscroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Farmer</th>
                <th>Reuniões agend.</th>
                <th>Em tramitação</th>
                <th>Demandas levantadas</th>
                <th>Convertidas (R$)</th>
              </tr>
            </thead>
            <tbody>
              {squads.map((sq) => (
                <SquadSection key={sq.id} squad={sq} search={search} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
