import PublicShell from "@/components/PublicShell";
export const metadata = {
  title: "Verification report | SmartClamp",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <PublicShell>
      <div className="container marketing-page">
        <h1>Report unavailable</h1>
        <p>
          A valid, issued verification report is required. This page does not
          publish sample measurements, signatures or customer identity. Public
          report issuance and verification are still being integrated.
        </p>
        <a className="btn btn-secondary" href="/support">
          Report support
        </a>
      </div>
    </PublicShell>
  );
}
