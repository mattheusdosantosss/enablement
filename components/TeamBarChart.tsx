"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

interface BarEntry { name: string; value: number; }

interface TeamBarChartProps {
  title: string;
  subtitle?: string;
  data: BarEntry[];
  color: string;
  format?: "brl" | "number";
  metric: string;
}

function shortName(name: string) {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

export default function TeamBarChart({ title, subtitle, data, color, format, metric }: TeamBarChartProps) {
  const fmt = format === "brl"
    ? (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`
    : (v: number) => String(v);
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const max = Math.max(...sorted.map((d) => d.value), 1);

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="title">{title}</div>
          {subtitle && <div className="cap">{subtitle}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--faint)" }}>{metric}</div>
          <div style={{ fontFamily: "var(--font-psa), var(--font-mono)", fontSize: 28, fontWeight: 800, color }}>
            {fmt(sorted.reduce((s, d) => s + d.value, 0))}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={Math.max(220, sorted.length * 48)}>
        <BarChart
          data={sorted.map((d) => ({ ...d, name: shortName(d.name) }))}
          layout="vertical"
          margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
        >
          <CartesianGrid horizontal={false} stroke="var(--border-soft)" />
          <XAxis
            type="number" domain={[0, max]} hide
          />
          <YAxis
            type="category" dataKey="name" width={130}
            tick={{ fill: "var(--muted)", fontSize: 12, fontFamily: "var(--font-sans)" }}
            axisLine={false} tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "var(--accent-soft)" }}
            contentStyle={{
              background: "var(--panel-2)", border: "1px solid var(--border)",
              borderRadius: 10, fontSize: 12, color: "var(--text)",
            }}
            formatter={(v) => [fmt(Number(v ?? 0)), metric]}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {sorted.map((_, i) => (
              <Cell key={i} fill={i === 0 ? color : `${color}99`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
