"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import type { ReactNode } from "react";

export interface BarEntry { name: string; value: number; id?: string; }

interface TeamBarChartProps {
  title: string;
  subtitle?: string;
  data: BarEntry[];
  color: string;
  format?: "brl" | "number";
  metric: string;
  headerRight?: ReactNode;
  onBarClick?: (entry: BarEntry) => void;
}

export default function TeamBarChart({
  title, subtitle, data, color, format, metric, headerRight, onBarClick,
}: TeamBarChartProps) {
  const fmt = format === "brl"
    ? (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`
    : (v: number) => String(v);
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const max = Math.max(...sorted.map((d) => d.value), 1);
  const total = sorted.reduce((s, d) => s + d.value, 0);

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="title">{title}</div>
          {subtitle && <div className="cap">{subtitle}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
          {headerRight && <div>{headerRight}</div>}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--faint)" }}>{metric}</div>
            <div style={{ fontFamily: "var(--font-psa), var(--font-mono)", fontSize: 28, fontWeight: 800, color }}>
              {fmt(total)}
            </div>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={Math.max(220, sorted.length * 48)}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
          onClick={(chartData: Record<string, unknown>) => {
            if (!onBarClick) return;
            const payloads = chartData?.activePayload as { payload: BarEntry }[] | undefined;
            if (!payloads?.[0]) return;
            onBarClick(payloads[0].payload);
          }}
          style={onBarClick ? { cursor: "pointer" } : undefined}
        >
          <CartesianGrid horizontal={false} stroke="var(--border-soft)" />
          <XAxis type="number" domain={[0, max]} hide />
          <YAxis
            type="category" dataKey="name" width={160}
            tick={{ fill: "var(--muted)", fontSize: 12, fontFamily: "var(--font-sans)" }}
            axisLine={false} tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{
              background: "#0d0f14",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 10,
              fontSize: 13,
              color: "#ffffff",
              boxShadow: "0 8px 32px rgba(0,0,0,0.65)",
            }}
            labelStyle={{ color: "#ffffff", fontWeight: 700, marginBottom: 6 }}
            itemStyle={{ color: "rgba(255,255,255,0.85)" }}
            formatter={(v) => [fmt(Number(v ?? 0)), metric]}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {sorted.map((_, i) => (
              <Cell key={i} fill={i === 0 ? color : `${color}99`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {onBarClick && (
        <div style={{ fontSize: 11, color: "var(--faint)", textAlign: "center", marginTop: 4, paddingBottom: 4 }}>
          Clique em uma barra para ver os detalhes
        </div>
      )}
    </div>
  );
}
