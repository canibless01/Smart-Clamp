import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "SmartClamp for shared buildings" + " | SmartClamp",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
