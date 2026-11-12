import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Connect an existing electricity meter" + " | SmartClamp",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
