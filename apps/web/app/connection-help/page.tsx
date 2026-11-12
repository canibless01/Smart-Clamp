"use client";
import { useState } from "react";
import PublicShell from "@/components/PublicShell";
import Icon from "@/components/Icon";
import Link from "next/link";
import { API_BASE } from "@/lib/api";
export default function Page() {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState("");
  async function check() {
    if (checking) return;
    setChecking(true);
    setResult("");
    const c = new AbortController();
    const timer = setTimeout(() => c.abort(), 8000);
    try {
      const r = await fetch(`${API_BASE}/feature-flags/active`, {
        signal: c.signal,
        cache: "no-store",
      });
      setResult(
        r.ok
          ? "Your browser reached the SmartClamp service. This does not confirm your device’s connection or electricity supply."
          : `The service responded, but could not complete the check (${r.status}). Please try again shortly.`,
      );
    } catch {
      setResult(
        "Your browser couldn’t reach SmartClamp. Check your internet, then try again. Your device’s supply state is unconfirmed.",
      );
    } finally {
      clearTimeout(timer);
      setChecking(false);
    }
  }
  return (
    <PublicShell>
      <div className="container marketing-page">
        <header className="marketing-heading">
          <span className="eyebrow">LET’S RECONNECT</span>
          <h1>
            A connection issue
            <br />
            isn’t always a power cut.
          </h1>
          <p>
            Your browser, your device and your electricity supply each have
            their own connection. Here’s how to tell them apart.
          </p>
        </header>
        <div className="marketing-feature-grid">
          {[
            {
              icon: "plug",
              title: "Your browser is offline.",
              text: "Check your mobile data or Wi-Fi. The app may still show values from an earlier visit; look for their observation time.",
            },
            {
              icon: "meter",
              title: "Your device hasn’t reported.",
              text: "Your internet may be working while the device or gateway is disconnected. Existing history can still be available, but live readings are unconfirmed.",
            },
            {
              icon: "bolt",
              title: "Your electricity is off.",
              text: "A supply interruption can also power down a device. Supported hardware saves an outage record locally and reports it after recovery.",
            },
          ].map((f) => (
            <article key={f.title}>
              <span className="outline-icon">
                <Icon name={f.icon as "plug" | "meter" | "bolt"} />
              </span>
              <h2>{f.title}</h2>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
        <section className="connection-check">
          <Icon name="plug" size={30} />
          <div>
            <h2>Start with a simple check.</h2>
            <p>Test whether your browser can reach the SmartClamp service.</p>
            <button
              onClick={() => void check()}
              disabled={checking}
              className="btn btn-primary"
            >
              {checking ? "Checking…" : "Check service connection"}
              <Icon name="arrow" size={16} />
            </button>
            {result && (
              <p className="connection-result" role="status">
                {result}
              </p>
            )}
          </div>
        </section>
        <div className="quiet-note">
          <Icon name="help" />
          <p>
            Still not sure what’s happening? Keep your device reference and the
            last reported time handy.
          </p>
          <Link href="/support" className="text-link">
            Get support
            <Icon name="arrow" size={15} />
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
