import "@fontsource-variable/manrope";
import "@fontsource-variable/dm-sans";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SmartClamp — Electricity you can verify",
  description:
    "See what you use. Understand what you pay. Control power where your device supports it.",
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <a
          href="#main"
          className="skip-link"
          style={{
            position: "absolute",
            left: -10000,
            top: "auto",
            width: 1,
            height: 1,
            overflow: "hidden",
          }}
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
