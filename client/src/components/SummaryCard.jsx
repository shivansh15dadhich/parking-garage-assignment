export default function SummaryCard({ label, value, accent }) {
  return (
    <div className={`summary-card ${accent ? `accent-${accent}` : ''}`}>
      <div className="summary-value">{value}</div>
      <div className="summary-label">{label}</div>
    </div>
  );
}
