import type { MetadataRoute } from "next";
import { products } from "@/data/catalogue";
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = process.env.SITE_URL;
  if (!origin) return [];
  const base = new URL(origin);
  if (base.protocol !== "https:") throw new Error("SITE_URL must use HTTPS");
  return [
    "",
    "/how-it-works",
    "/for-homeowners",
    "/for-landlords",
    "/smart-meter",
    "/pricing",
    "/about",
    "/faqs",
    ...products.map((p) => `/products/${p.slug}`),
    ...["basic", "basic-pro", "pro"].map((p) => `/plans/${p}`),
  ].map((path) => ({ url: base.origin + path }));
}
