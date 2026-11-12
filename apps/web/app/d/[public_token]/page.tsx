import PublicShell from "@/components/PublicShell";
export const metadata = {
  title: "Shared device view | SmartClamp",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <PublicShell>
      <div className="container marketing-page">
        <h1>Shared view unavailable</h1>
        <p>
          Public device sharing is not enabled. A valid, deliberately issued
          scope is required before measurements or billing details can be
          published.
        </p>
        <a className="btn btn-secondary" href="/login">
          Log in to your private dashboard
        </a>
      </div>
    </PublicShell>
  );
}
