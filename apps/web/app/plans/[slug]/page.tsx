import { notFound } from "next/navigation";
import PublicShell from "@/components/PublicShell";
import PlanComparison from "@/components/PlanComparison";
export function generateStaticParams() {
  return ["basic", "basic-pro", "pro"].map((slug) => ({ slug }));
}
export function generateMetadata({ params }: { params: { slug: string } }) {
  return {
    title: `SmartClamp ${params.slug.replace(/-/g, " ")} plan`,
    description:
      "Understand monitoring, insight and hardware-dependent control before choosing a SmartClamp plan.",
  };
}
export default function Page({ params }: { params: { slug: string } }) {
  if (!["basic", "basic-pro", "pro"].includes(params.slug)) notFound();
  const name =
    params.slug === "pro"
      ? "Pro"
      : params.slug === "basic-pro"
        ? "Basic Pro"
        : "Basic";
  return (
    <PublicShell>
      <div className="container marketing-page">
        <header className="marketing-heading">
          <span className="eyebrow">SMARTCLAMP {name.toUpperCase()}</span>
          <h1>
            {name === "Pro"
              ? "Insight, with eligible control."
              : name === "Basic Pro"
                ? "Look a little deeper."
                : "Start with a clearer picture."}
          </h1>
          <p>
            {name === "Pro"
              ? "Pair the insight layer with a physically fitted, qualified relay. Buying a plan cannot add a relay to monitoring-only hardware."
              : name === "Basic Pro"
                ? "The same sensing hardware as Basic, with a roadmap for deeper analysis and stronger evidence."
                : "See measurements from your connected device, review records and keep your payment history in perspective."}
          </p>
        </header>
        <section className="card">
          <h2>Before you choose</h2>
          <p>
            Final pricing, billing periods, data retention and availability will
            be confirmed before purchase. Paid subscriptions are not currently
            enabled.
          </p>
          <a className="btn btn-primary" href="/support">
            Discuss my setup
          </a>
        </section>
        <PlanComparison />
      </div>
    </PublicShell>
  );
}
