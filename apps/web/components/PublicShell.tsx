"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { Brand } from "./Icon";
const links = [
  ["How it works", "/how-it-works"],
  ["For your home", "/for-homeowners"],
  ["For your building", "/for-landlords"],
  ["Devices", "/#devices"],
  ["Plans", "/pricing"],
];
export default function PublicShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const path = usePathname();
  useEffect(() => {
    if (!open) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    menu.current?.querySelector<HTMLElement>("a")?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
      if (e.key === "Tab") {
        const controls =
          menu.current?.querySelectorAll<HTMLElement>("a,button");
        if (!controls?.length) return;
        const first = controls[0],
          last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      window.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <div className="public-site">
      <header className="site-header">
        <div className="site-nav container">
          <Link href="/" aria-label="SmartClamp home">
            <Brand />
          </Link>
          <nav className="desktop-links" aria-label="Main navigation">
            {links.map(([title, url]) => (
              <Link
                href={url}
                key={url}
                aria-current={path === url ? "page" : undefined}
              >
                {title}
              </Link>
            ))}
          </nav>
          <div className="nav-actions">
            <Link href="/login" className="login-link">
              Log in
            </Link>
            <Link href="/signup" className="btn btn-primary nav-cta">
              Get started <Icon name="arrow" size={16} />
            </Link>
            <button
              ref={toggle}
              className="menu-toggle icon-button"
              aria-label={open ? "Close navigation" : "Open navigation"}
              aria-expanded={open}
              aria-controls="site-menu"
              onClick={() => setOpen(!open)}
            >
              <Icon name={open ? "close" : "menu"} />
            </button>
          </div>
        </div>
      </header>
      {open && (
        <div
          ref={menu}
          className="site-mobile-menu"
          id="site-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <div className="mobile-menu-top">
            <Brand />
            <button
              className="icon-button"
              aria-label="Close navigation"
              onClick={() => {
                setOpen(false);
                toggle.current?.focus();
              }}
            >
              <Icon name="close" />
            </button>
          </div>
          <nav>
            {[
              ...links,
              ["About SmartClamp", "/about"],
              ["Help & support", "/support"],
            ].map(([title, url]) => (
              <Link key={url} href={url} onClick={() => setOpen(false)}>
                {title}
                <Icon name="arrow" />
              </Link>
            ))}
          </nav>
          <Link
            href="/signup"
            onClick={() => setOpen(false)}
            className="btn btn-primary"
          >
            Make sense of your power <Icon name="arrow" />
          </Link>
        </div>
      )}
      <main id="main" className="public-main">
        {children}
      </main>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-main">
            <div className="footer-intro">
              <Link href="/" aria-label="SmartClamp home">
                <Brand />
              </Link>
              <p>
                A clearer picture of your power.
                <br />A little more peace of mind.
              </p>
              <span className="footer-location">
                <span className="status-dot" /> Built for homes in Nigeria.
              </span>
            </div>
            {[
              [
                "Explore",
                [
                  ["How it works", "/how-it-works"],
                  ["For homeowners", "/for-homeowners"],
                  ["For landlords", "/for-landlords"],
                  ["Have a smart meter?", "/smart-meter"],
                  ["Plans", "/pricing"],
                ],
              ],
              [
                "We’re here to help",
                [
                  ["Support", "/support"],
                  ["Common questions", "/faqs"],
                  ["Connection help", "/connection-help"],
                  ["Installation", "/install"],
                ],
              ],
              [
                "SmartClamp",
                [
                  ["Our story", "/about"],
                  ["Privacy", "/privacy"],
                  ["Terms of service", "/terms"],
                ],
              ],
            ].map(([title, items]) => (
              <div className="footer-links" key={title as string}>
                <h3>{title as string}</h3>
                {(items as string[][]).map(([t, url]) => (
                  <Link key={url} href={url}>
                    {t}
                  </Link>
                ))}
              </div>
            ))}
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} SmartClamp</span>
            <p>
              SmartClamp provides sub-metering and verification technology. It
              does not generate, resell or distribute electricity, or replace
              your utility meter.
            </p>
            <span>Measure. Verify. Manage.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
