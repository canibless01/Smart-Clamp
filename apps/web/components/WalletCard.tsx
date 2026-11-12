import { formatNaira } from "@/lib/api";
import Icon from "./Icon";
export default function WalletCard({
  available,
  reserved,
  ledgerVersion,
  updatedAt,
}: {
  available: number | null;
  reserved: number | null;
  ledgerVersion?: number;
  updatedAt?: string;
}) {
  return (
    <div className="card wallet-card">
      <div className="wallet-heading">
        <span className="metric-label">Electricity wallet</span>
        <span className="wallet-icon">
          <Icon name="wallet" size={20} />
        </span>
      </div>
      <div className="metric-value wallet-value">
        {available == null ? "—" : formatNaira(available)}
      </div>
      <p className="wallet-description">
        {available == null
          ? "Your confirmed balance will appear here."
          : "Available electricity credit"}
        {reserved != null && reserved > 0
          ? ` · ${formatNaira(reserved)} pending`
          : ""}
      </p>
      <div className="wallet-actions">
        <a href="/billing" className="btn btn-primary">
          Recharge
          <Icon name="arrow" size={15} />
        </a>
        <a href="/billing" className="text-link">
          Payment history
        </a>
      </div>
      <p className="metric-time">
        {updatedAt && Number.isFinite(Date.parse(updatedAt))
          ? `Updated ${new Date(updatedAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}`
          : "Awaiting a confirmed wallet update."}
      </p>
    </div>
  );
}
