import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "About SmartClamp" + " | SmartClamp",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
