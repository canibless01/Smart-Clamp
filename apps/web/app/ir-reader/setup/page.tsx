import PublicShell from "@/components/PublicShell";
export default function Page() {
  return (
    <PublicShell>
      <div className="container marketing-page">
        <header className="marketing-heading">
          <span className="eyebrow">YOUR EXISTING METER</span>
          <h1>A reader that fits your meter.</h1>
          <p>
            An account lookup does not establish optical compatibility. No meter
            model is advertised as supported until its adapter passes
            qualification.
          </p>
        </header>
        <section className="card">
          <h2>Before installation</h2>
          <ol className="device-steps">
            <li>Record your meter’s manufacturer and exact model.</li>
            <li>
              Ask our team to confirm optical-port access, protocol and
              available fields.
            </li>
            <li>
              Have a qualified installer fit and commission the approved reader.
            </li>
            <li>Link the supplied device claim code to your account.</li>
          </ol>
          <div className="resource-actions">
            <a href="/support" className="btn btn-primary">
              Check my setup with the team
            </a>
            <a href="/devices/link" className="btn btn-secondary">
              Link an installed reader
            </a>
            <a href="/products/meter-reader" className="text-link">
              Explore the reader
            </a>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
