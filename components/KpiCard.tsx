interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
}

export default function KpiCard({ label, value, sub, highlight }: KpiCardProps) {
  return (
    <div className="bg-brand-surface border border-brand-border rounded-lg p-4 flex flex-col gap-1">
      <span className="text-xs text-brand-muted uppercase tracking-wider">{label}</span>
      <span
        className={`text-2xl font-bold font-mono ${
          highlight ? "text-brand-orange" : "text-brand-text"
        }`}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-brand-muted">{sub}</span>}
    </div>
  );
}
