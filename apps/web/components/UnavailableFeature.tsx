import SignalLight from "./SignalLight";
import AppShell from "./AppShell";
export default function UnavailableFeature({
  title,
  description,
  role,
}: {
  title: string;
  description: string;
  role?: string;
}) {
  return (
    <AppShell role={role}>
      <div className="workspace-empty">
        <SignalLight icon="shield" label="Availability" state="Not enabled" tone="unknown"/>
        <h1>{title}</h1>
        <p>{description}</p>
        <p>This feature is not enabled. No action has been performed.</p>
        <div className="resource-actions">
          <a href="/support" className="btn btn-primary">
            Ask about this feature
          </a>
          <a href="/pricing#compare" className="btn btn-secondary">
            View feature availability
          </a>
        </div>
      </div>
    </AppShell>
  );
}
