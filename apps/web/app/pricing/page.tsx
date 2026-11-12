import PublicShell from "@/components/PublicShell";
import Icon from "@/components/Icon";
import Link from "next/link";
const plans = [
  {
    name: "Free",
    label: "A simple first step.",
    price: "₦0",
    detail: "For meter validation",
    features: [
      "Check a meter account",
      "No signup needed",
      "Explore your options",
    ],
    link: "/#meter",
    cta: "Check your meter",
  },
  {
    name: "Basic",
    label: "Get a clearer picture.",
    price: "Coming to the pilot",
    detail: "Pricing being finalized",
    features: [
      "Usage monitoring & history",
      "Alerts and energy records",
      "Your home at a glance",
    ],
    link: "/signup",
    cta: "Start with the basics",
  },
  {
    name: "Basic Pro",
    label: "Go a little deeper.",
    price: "Coming to the pilot",
    detail: "Pricing being finalized",
    features: [
      "Everything in Basic",
      "Supported forecasts & insights",
      "Deeper reports and comparisons",
    ],
    link: "/signup",
    cta: "Explore more insight",
  },
  {
    name: "Pro",
    label: "Clarity meets control.",
    price: "Coming to the pilot",
    detail: "Pricing being finalized",
    features: [
      "Everything in Basic Pro",
      "Eligible relay control",
      "Supported schedules & budgets",
    ],
    link: "/signup",
    cta: "Explore Pro",
  },
];
export default function Page() {
  return (
    <PublicShell>
      <div className="container marketing-page">
        <header className="marketing-heading center">
          <span className="eyebrow">FIND YOUR LEVEL OF CLARITY</span>
          <h1>
            A plan that feels
            <br />
            at home with you.
          </h1>
          <p>
            Start with what you need. Add more insight or eligible control as
            your setup grows.
          </p>
        </header>
        <div className="plan-grid">
          {plans.map((p, i) => (
            <article
              key={p.name}
              className={`plan-card ${i === 2 ? "featured" : ""}`}
            >
              <span className="eyebrow">{p.name}</span>
              <h2>{p.label}</h2>
              <div className="plan-price">
                {p.price}
                <small>{p.detail}</small>
              </div>
              <ul>
                {p.features.map((f) => (
                  <li key={f}>
                    <Icon name="check" size={15} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={p.link}
                className={`btn ${i === 2 ? "btn-primary" : "btn-secondary"}`}
              >
                {p.cta}
                <Icon name="arrow" size={14} />
              </Link>
            </article>
          ))}
        </div>
        <div className="plan-note">
          <Icon name="wallet" />
          <p>
            Your platform plan, electricity credit, hardware and installation
            are separate. Paid pricing will be confirmed before purchase. Pro
            control requires compatible, commissioned hardware.
          </p>
        </div>
        <section className="marketing-two">
          <div>
            <span className="eyebrow">SHARING A BUILDING?</span>
            <h2>
              Let’s find the
              <br />
              right fit, together.
            </h2>
            <p>
              Room-level measurement and building-wide visibility deserve a
              setup that fits your property.
            </p>
          </div>
          <div className="building-enquiry">
            <Icon name="building" size={40} />
            <h3>A clearer picture for every room.</h3>
            <p>
              Tell our team about your building, existing meter and the number
              of rooms you’d like to connect.
            </p>
            <Link href="/support" className="btn btn-primary">
              Talk to the team <Icon name="arrow" size={16} />
            </Link>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
