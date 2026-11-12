import PublicShell from "@/components/PublicShell";
import Image from "next/image";
import Link from "next/link";
import Icon from "@/components/Icon";
export default function Page() {
  return (
    <PublicShell>
      <div className="container marketing-page">
        <header className="marketing-heading">
          <span className="eyebrow">A CLEARER WAY TO SEE POWER</span>
          <h1>
            Electricity touches
            <br />
            everything at home.
          </h1>
          <p>
            Understanding it shouldn’t be complicated. SmartClamp is being built
            to give Nigerian homes and shared buildings a clearer record of what
            they use.
          </p>
        </header>
        <div className="about-visual">
          <Image
            src="/images/energy-home.png"
            alt="Illustrative warmly illuminated home"
            fill
            sizes="100vw"
            priority
          />
          <span>More clarity. A little more peace of mind.</span>
        </div>
        <section className="marketing-two">
          <div>
            <span className="eyebrow">WHY WE’RE HERE</span>
            <h2>
              Less guessing.
              <br />
              Better conversations.
            </h2>
            <p>
              A confusing bill. An uneven split between rooms. A question about
              what really happened. We want measured records to make those
              conversations a little easier.
            </p>
          </div>
          <div className="simple-feature-list">
            <div>
              <h3>Measure.</h3>
              <p>Start with readings from the wire or a supported meter.</p>
            </div>
            <div>
              <h3>Verify.</h3>
              <p>Compare the available records and make their limits clear.</p>
            </div>
            <div>
              <h3>Manage.</h3>
              <p>
                Understand usage, follow payments and control supported
                hardware.
              </p>
            </div>
          </div>
        </section>
        <div className="quiet-note">
          <Icon name="home" />
          <p>
            We’re preparing our initial pilot around the FUTA area. We’ll share
            results when there’s real, verified evidence to show.
          </p>
          <Link href="/support" className="text-link">
            Talk to us
            <Icon name="arrow" size={15} />
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
