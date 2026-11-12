import { notFound } from "next/navigation";
import PublicShell from "@/components/PublicShell";
import Icon, { IconName } from "@/components/Icon";
import { products } from "@/data/catalogue";
export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}
export function generateMetadata({ params }: { params: { slug: string } }) {
  const p = products.find((p) => p.slug === params.slug);
  return {
    title: p ? `${p.name} | SmartClamp` : "Device not found",
    description: p?.description,
  };
}
export default function Page({ params }: { params: { slug: string } }) {
  const p = products.find((p) => p.slug === params.slug);
  if (!p) notFound();
  return (
    <PublicShell>
      <div className="container marketing-page">
        <header className="marketing-heading">
          <span className="eyebrow">{p.audience}</span>
          <h1>{p.name}</h1>
          <p>{p.summary}</p>
        </header>
        <section className="marketing-two">
          <div className="product-concept">
            <span className="device-wire" />
            <span className="device-enclosure">
              <Icon name={p.icon as IconName} size={64} />
              <small>SmartClamp</small>
              <span className="status-dot" />
            </span>
            <span className="device-wire" />
          </div>
          <div>
            <h2>A part of your energy picture.</h2>
            <p>{p.description}</p>
            <ul>
              {p.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <p>
              <strong>Connection:</strong> {p.connectivity}
            </p>
            <a className="btn btn-primary" href="/support">
              Discuss my setup <Icon name="arrow" />
            </a>
          </div>
        </section>
        <section className="card">
          <h2>From installation to insight.</h2>
          <ol className="device-steps">
            {p.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <h3>What your installation needs</h3>
          <p>{p.needs}</p>
          <p>
            Hardware is in qualification. Availability and final specifications
            will be confirmed before purchase. Account linking alone does not
            commission a device.
          </p>
        </section>
        <div className="resource-actions">
          <a className="btn btn-secondary" href="/pricing#compare">
            Compare plans
          </a>
          <a className="text-link" href="/#devices">
            Explore other devices
          </a>
        </div>
      </div>
    </PublicShell>
  );
}
