import PublicShell from "@/components/PublicShell";
import MeterLookup from "@/components/MeterLookup";
import Icon from "@/components/Icon";
import Link from "next/link";
export default function Page() {
  return (
    <PublicShell>
      <div className="container marketing-page">
        <header className="marketing-heading">
          <span className="eyebrow">YOUR METER. A NEW PERSPECTIVE.</span>
          <h1>
            Already connected?
            <br />
            Let’s start there.
          </h1>
          <p>
            Check your meter account for free.
            <br />
            Then explore the right way to bring its readings into focus.
          </p>
        </header>
        <div className="meter-page-layout">
          <MeterLookup />
          <div className="simple-feature-list">
            <div>
              <Icon name="meter" />
              <h3>A supported optical reader.</h3>
              <p>
                An IR-Reader can collect data from compatible meters. Meter
                model and connection support need confirmation before purchase.
              </p>
              <Link href="/ir-reader/setup" className="text-link">
                Explore a reader <Icon name="arrow" size={15} />
              </Link>
            </div>
            <div>
              <Icon name="shield" />
              <h3>Keep your own evidence.</h3>
              <p>
                Supported manual reading and photo records can help you follow
                usage. They stay clearly distinguished from automatically
                measured readings.
              </p>
              <Link href="/meters/link" className="text-link">
                Link a meter <Icon name="arrow" size={15} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
