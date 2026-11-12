import Image from "next/image";
import Link from "next/link";
import PublicShell from "./PublicShell";
import Icon, { IconName } from "./Icon";
export default function AudiencePage({
  building = false,
}: {
  building?: boolean;
}) {
  const features = building
    ? [
        {
          icon: "building",
          title: "A building-wide view.",
          text: "See the bigger picture while each room keeps its own consumption record.",
        },
        {
          icon: "wallet",
          title: "Less guesswork over bills.",
          text: "Make room-level usage and payment records easier to follow.",
        },
        {
          icon: "shield",
          title: "A record to come back to.",
          text: "Use a shared history to understand questions and resolve differences.",
        },
      ]
    : [
        {
          icon: "chart",
          title: "Get to know your usage.",
          text: "See what your home uses and how that changes over time.",
        },
        {
          icon: "wallet",
          title: "Make sense of your bill.",
          text: "Keep consumption, payments and records in one place.",
        },
        {
          icon: "bolt",
          title: "A little more control.",
          text: "Eligible relay hardware lets you request switching and set supported schedules.",
        },
      ];
  return (
    <PublicShell>
      <div className="container marketing-page">
        <section className="marketing-hero">
          <div>
            <span className="eyebrow">
              {building ? "FOR SHARED BUILDINGS" : "FOR YOUR HOME"}
            </span>
            <h1>
              {building ? (
                <>
                  A shared home.
                  <br />A fairer picture.
                </>
              ) : (
                <>
                  Your home.
                  <br />
                  In a new light.
                </>
              )}
            </h1>
            <p>
              {building
                ? "Bring room-level usage and the building’s energy story together. Help everyone understand their part."
                : "Understand the electricity behind your everyday life, with a clear view of usage, bills and supported controls."}
            </p>
            <Link
              href={`/signup?setup=${building ? "landlord" : "homeowner"}`}
              className="btn btn-primary"
            >
              {building ? "Set up your building" : "Find your setup"}
              <Icon name="arrow" size={16} />
            </Link>
          </div>
          <div className="marketing-photo">
            <Image
              src="/images/energy-home.png"
              alt="Illustrative home with illuminated rooms at dusk"
              fill
              sizes="(max-width:640px) 100vw, 50vw"
              priority
            />
            <div className="marketing-photo-label">
              <Icon name={building ? "building" : "home"} />
              {building
                ? "Every room has a story."
                : "A clearer picture of your power."}
            </div>
          </div>
        </section>
        <section className="marketing-feature-grid">
          {features.map((f) => (
            <article key={f.title}>
              <span className="outline-icon">
                <Icon name={f.icon as IconName} />
              </span>
              <h2>{f.title}</h2>
              <p>{f.text}</p>
            </article>
          ))}
        </section>
        <section className="marketing-two">
          <div>
            <span className="eyebrow">GOOD TO KNOW</span>
            <h2>
              {building
                ? "Clarity for everyone."
                : "Start with insight.\nGrow from there."}
            </h2>
            <p>
              {building
                ? "Room balances, building totals and maintenance requests have different jobs. SmartClamp keeps them clear and separate."
                : "Monitoring and analytics don’t need a relay. Remote switching does. We’ll help match the setup to the capabilities you need."}
            </p>
            <Link href="/pricing" className="text-link">
              Compare your options <Icon name="arrow" size={16} />
            </Link>
          </div>
          <div className="simple-feature-list">
            {(building
              ? [
                  [
                    "With a central meter",
                    "A measured room-level view within your existing building supply.",
                  ],
                  [
                    "For your residents",
                    "Individual access to their usage, balances and history.",
                  ],
                  [
                    "For the landlord",
                    "A building overview and room management, without rent-related power cutoffs.",
                  ],
                ]
              : [
                  [
                    "Basic",
                    "Usage monitoring, history and a record of your energy.",
                  ],
                  [
                    "Basic Pro",
                    "Additional insights and analytics, where sufficient data is available.",
                  ],
                  [
                    "Pro",
                    "Eligible power control with compatible, commissioned relay hardware.",
                  ],
                ]
            ).map(([t, d]) => (
              <div key={t}>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </section>
        <div className="quiet-note">
          <Icon name="help" />
          <p>
            We’re preparing our pilot around the FUTA area. Hardware,
            installation availability and pricing are confirmed with the team
            before an order.
          </p>
          <Link href="/support" className="text-link">
            Talk to us <Icon name="arrow" size={16} />
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
