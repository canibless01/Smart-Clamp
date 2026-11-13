import PublicShell from "@/components/PublicShell";
import SharedReport from "@/components/SharedReport";
export const metadata = { title: "Measurement report | SmartClamp", robots: { index: false, follow: false } };
export default function Page({ params }: { params: { token: string } }) {
  return <PublicShell><div className="container marketing-page"><h1>Shared measurement report</h1><p>This is an issued snapshot. Its signature preserves the recorded bytes; it is not a certification of metering accuracy.</p><SharedReport token={params.token} /></div></PublicShell>;
}
