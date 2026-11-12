"use client";
import { useRef } from "react";
import Link from "next/link";
import Icon, { IconName } from "./Icon";
import { products } from "@/data/catalogue";
export default function ProductCarousel() {
  const rail = useRef<HTMLDivElement>(null);
  return (
    <section
      className="container product-section"
      aria-labelledby="product-heading"
    >
      <div className="overview-heading">
        <div>
          <span className="eyebrow">ONE CONNECTED ECOSYSTEM</span>
          <h2 id="product-heading">Find your place in the picture.</h2>
          <p>
            From one room to a shared building. Explore what each device does.
          </p>
        </div>
        <div className="resource-actions">
          <button
            className="icon-button"
            aria-label="Previous devices"
            onClick={() =>
              rail.current?.scrollBy({
                left: -370,
                behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "auto"
                  : "smooth",
              })
            }
          >
            <Icon name="arrow" style={{ transform: "rotate(180deg)" }} />
          </button>
          <button
            className="icon-button"
            aria-label="Next devices"
            onClick={() =>
              rail.current?.scrollBy({
                left: 370,
                behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "auto"
                  : "smooth",
              })
            }
          >
            <Icon name="arrow" />
          </button>
        </div>
      </div>
      <div
        ref={rail}
        className="product-rail"
        tabIndex={0}
        aria-label="SmartClamp device range"
      >
        {products.map((p, i) => (
          <article className="product-card" key={p.slug}>
            <div className={`product-concept product-concept-${i}`}>
              <span className="device-wire" />
              <span className="device-enclosure">
                <Icon name={p.icon as IconName} size={46} />
                <small>SmartClamp</small>
                <span className="status-dot" />
              </span>
              <span className="device-wire" />
            </div>
            <span className="eyebrow">{p.audience}</span>
            <h3>{p.name}</h3>
            <p>{p.summary}</p>
            <Link className="text-link" href={`/products/${p.slug}`}>
              Explore this device <Icon name="arrow" size={16} />
            </Link>
          </article>
        ))}
      </div>
      <p className="meter-help">
        Concept illustrations. Final enclosures, availability and installation
        pricing will be confirmed before purchase.
      </p>
    </section>
  );
}
