import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "How SmartClamp works" + " | SmartClamp",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
