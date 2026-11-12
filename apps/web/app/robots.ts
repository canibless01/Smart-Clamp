import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const origin = process.env.SITE_URL;
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard/",
        "/ops/",
        "/admin/",
        "/settings/",
        "/devices/",
        "/billing",
        "/history",
        "/control",
        "/alerts",
        "/portal",
        "/orders",
        "/disputes/",
        "/payments/",
        "/join",
        "/d/",
        "/verification-reports/",
        "/api/",
      ],
    },
    ...(origin ? { sitemap: `${origin.replace(/\/$/, "")}/sitemap.xml` } : {}),
  };
}
