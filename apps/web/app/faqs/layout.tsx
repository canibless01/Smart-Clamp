import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "SmartClamp questions, answered" + " | SmartClamp",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
