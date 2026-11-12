import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "SmartClamp for your home" + " | SmartClamp",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
