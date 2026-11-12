import PublicShell from "@/components/PublicShell";
import SystemMap from "@/components/SystemMap";
import Icon from "@/components/Icon";
import Link from "next/link";
export default function Page() {
  return (
    <PublicShell>
      <div className="container marketing-page">
        <header className="marketing-heading">
          <span className="eyebrow">THE BIGGER PICTURE</span>
          <h1>
            From your wire.
            <br />
            To your everyday.
          </h1>
          <p>
            A small device measures. A connected platform makes sense of it.
            <br />
            You get a clearer picture of what’s happening at home.
          </p>
        </header>
        <SystemMap />
        <section className="marketing-two">
          <div>
            <span className="eyebrow">BUILT AROUND YOUR SETUP</span>
            <h2>
              One home isn’t
              <br />
              every home.
            </h2>
            <p>
              A single home, a room in a shared building, or an existing smart
              meter—each needs a slightly different connection.
            </p>
            <Link href="/#for-you" className="btn btn-primary">
              Find your setup <Icon name="arrow" size={16} />
            </Link>
          </div>
          <div className="simple-feature-list">
            {[
              [
                "Your home",
                "A pole device can measure whole-home usage. Supported relay hardware adds eligible control.",
              ],
              [
                "A shared building",
                "Room devices measure individual consumption and connect through a building hub.",
              ],
              [
                "An existing meter",
                "Start with free account validation. Compatible optical readers can add meter readings.",
              ],
            ].map(([t, d]) => (
              <div key={t}>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </section>
        <div className="quiet-note">
          <Icon name="shield" />
          <p>
            Electrical installation needs qualified professionals.
            Compatibility, metering accuracy and control capabilities must be
            confirmed for your specific setup.
          </p>
          <Link href="/install" className="text-link">
            Installation <Icon name="arrow" size={15} />
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
