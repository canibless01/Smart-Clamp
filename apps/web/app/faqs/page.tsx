import PublicShell from "@/components/PublicShell";
import Link from "next/link";
import Icon from "@/components/Icon";
const questions = [
  [
    "Getting started",
    [
      [
        "What is SmartClamp?",
        "A platform and device family designed to help homes and shared buildings understand electricity usage, keep records and manage supported devices.",
      ],
      [
        "Do I need an existing meter?",
        "Not necessarily. The right setup depends on your property. Our first shared-building pilot focuses on buildings with an existing central meter.",
      ],
      [
        "Where can I get it?",
        "We’re preparing the pilot around the FUTA area. Contact our team about your property; hardware, installation availability and pricing need confirmation.",
      ],
    ],
  ],
  [
    "Your setup",
    [
      [
        "Can I use my existing smart meter?",
        "Start with the free account lookup. Supported meters may connect through a compatible optical reader. Validation alone does not provide live balance or usage.",
      ],
      [
        "Can I install it myself?",
        "Mains-connected sensors and relay hardware require qualified electrical installation. Your hardware must be configured, calibrated and commissioned before use.",
      ],
      [
        "Can SmartClamp turn off power?",
        "Only compatible, commissioned relay hardware supports switching. Monitoring-only devices do not. Remote requests need authorization and confirmed device feedback.",
      ],
    ],
  ],
  [
    "Usage, payments and connection",
    [
      [
        "What if the internet is unavailable?",
        "Supported devices retain readings locally and upload when connected again. The app should clearly show the last confirmed observation time.",
      ],
      [
        "Does a subscription payment buy electricity?",
        "No. Your platform subscription, electricity credit, hardware and installation are separate.",
      ],
      [
        "Can a landlord disconnect a tenant over rent?",
        "No. The product specification excludes punitive rent-related power disconnection.",
      ],
      [
        "What if a reading or bill looks wrong?",
        "Use the dispute and support flows to review the relevant period and records. A billing dispute does not itself switch electricity off.",
      ],
    ],
  ],
];
export default function Page() {
  return (
    <PublicShell>
      <div className="container marketing-page">
        <header className="marketing-heading">
          <span className="eyebrow">GOOD QUESTIONS. CLEARER ANSWERS.</span>
          <h1>
            A little clarity
            <br />
            goes a long way.
          </h1>
          <p>Get to know the basics before you get started.</p>
        </header>
        <div className="faq-topics">
          {questions.map(([title, items]) => (
            <section key={title as string}>
              <h2>{title as string}</h2>
              <div className="faq-list">
                {(items as string[][]).map(([q, a]) => (
                  <details key={q}>
                    <summary>
                      {q}
                      <span className="faq-plus" aria-hidden="true">
                        +
                      </span>
                    </summary>
                    <p>{a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="quiet-note">
          <Icon name="help" />
          <p>Still have a question? Tell us a little about what you need.</p>
          <Link href="/support" className="text-link">
            Talk to the team <Icon name="arrow" size={15} />
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
