interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  lead?: boolean;
}

export default function KpiCard({ label, value, sub, lead }: KpiCardProps) {
  return (
    <div className={`kpi${lead ? " lead" : ""}`}>
      <div className="lab">{label}</div>
      <div className="num">{value}</div>
      {sub && <div className="cap">{sub}</div>}
    </div>
  );
}
