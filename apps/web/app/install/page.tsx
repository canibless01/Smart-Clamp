import PublicShell from "@/components/PublicShell";
export default function Page() {
  return (
    <PublicShell>
      <div className="container marketing-page">
        <header className="marketing-heading">
          <span className="eyebrow">A CONNECTED START</span>
          <h1>From installation to your first reading.</h1>
          <p>
            Your account, the physical installation and the cloud connection
            each have a separate part to play.
          </p>
        </header>
        <section className="card">
          <ol className="device-steps">
            <li>
              Choose the device that fits your home or building with our team.
            </li>
            <li>
              Your installer confirms wiring, sensors, communications and
              calibrated settings.
            </li>
            <li>
              The device is provisioned with its own identity and keys, then
              commissioned after diagnostics pass.
            </li>
            <li>
              Use your single-use claim code to link it to your account or room.
            </li>
            <li>
              Open your dashboard. Readings appear when signed measurements
              arrive; missing data remains unknown.
            </li>
          </ol>
          <p>
            A meter account lookup cannot calibrate or commission hardware. This
            page does not simulate scanning, installation or successful
            diagnostics.
          </p>
          <div className="resource-actions">
            <a className="btn btn-primary" href="/devices/link">
              Link an installed SmartClamp
            </a>
            <a className="btn btn-secondary" href="/support">
              Discuss installation
            </a>
            <a className="text-link" href="/#devices">
              Explore the device range
            </a>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
