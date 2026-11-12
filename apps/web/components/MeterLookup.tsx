"use client";
import { useState, useEffect, useRef, FormEvent } from "react";
import { API_BASE } from "@/lib/api";
import Icon from "./Icon";
type State = "idle" | "loading" | "valid" | "error";
export default function MeterLookup() {
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [service, setService] = useState("");
  useEffect(() => {
    const c = new AbortController();
    fetch(`${API_BASE}/public/electricity-providers`, { signal: c.signal })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => {
        setServices(d.items || []);
        if (d.items?.length === 1) setService(d.items[0].id);
      })
      .catch(() => {});
    return () => c.abort();
  }, []);
  const [meter, setMeter] = useState("");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<any>(null);
  const [cooldown, setCooldown] = useState(0);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => {
    if (!cooldown) return;
    const id = setTimeout(() => setCooldown((v) => v - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);
  async function check(e: FormEvent) {
    e.preventDefault();
    if (state === "loading" || cooldown) return;
    if (!/^[0-9]{6,20}$/.test(meter.trim())) {
      setMessage("Enter your meter’s 6–20 digit number.");
      setState("error");
      return;
    }
    setState("loading");
    setMessage("");
    setResult(null);
    const controller = new AbortController();
    pending.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`${API_BASE}/meters/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meter_number: meter.trim(),
          utility_type: "electricity",
          ...(service ? { service_id: service } : {}),
        }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        const retry = Number(res.headers.get("Retry-After"));
        setCooldown(
          Number.isFinite(retry) && retry > 0 ? Math.min(retry, 3600) : 60,
        );
        throw new Error(
          "A few too many checks. Please wait before trying again.",
        );
      }
      if (res.status === 503)
        throw new Error(
          "The meter provider is unavailable right now. Please try again shortly.",
        );
      if (!res.ok)
        throw new Error(
          data.message || "We couldn’t complete the lookup. Please try again.",
        );
      if (!data.valid)
        throw new Error(
          "We couldn’t find that meter. Check the number and try again.",
        );
      setResult(data);
      setState("valid");
    } catch (err) {
      setState("error");
      setMessage(
        controller.signal.aborted
          ? "The lookup took longer than expected. You can try again."
          : err instanceof Error
            ? err.message
            : "We couldn’t connect. Check your internet and try again.",
      );
    } finally {
      clearTimeout(timeout);
      pending.current = null;
    }
  }
  return (
    <div className="meter-lookup">
      <h3>Your first bit of clarity.</h3>
      <form onSubmit={check} noValidate aria-label="Check your meter">
        {services.length > 1 && (
          <label htmlFor="electricity-provider">
            Electricity provider
            <select
              className="input"
              id="electricity-provider"
              value={service}
              disabled={state === "loading"}
              onChange={(e) => {
                setService(e.target.value);
                setResult(null);
                setState("idle");
              }}
            >
              <option value="">Choose your provider</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label htmlFor="meter-number">Meter number</label>
        <div className="meter-form-row">
          <input
            id="meter-number"
            className="input"
            value={meter}
            onChange={(e) => {
              setMeter(e.target.value);
              if (state !== "loading") {
                setState("idle");
                setMessage("");
                setResult(null);
              }
            }}
            placeholder="e.g. 04217839011"
            inputMode="numeric"
            autoComplete="off"
            maxLength={20}
            aria-describedby="meter-help meter-feedback"
            aria-invalid={state === "error"}
            disabled={state === "loading"}
          />
          <button
            type="submit"
            disabled={
              state === "loading" ||
              cooldown > 0 ||
              (services.length > 1 && !service)
            }
            className="btn btn-primary"
          >
            {state === "loading"
              ? "Checking…"
              : cooldown
                ? `Wait ${cooldown}s`
                : "Check meter"}
            <Icon name="arrow" size={15} />
          </button>
        </div>
        <p id="meter-help" className="meter-help">
          No account needed. This validates the meter account; it does not
          reveal a live balance, usage history or your full address. Leading
          zeros stay exactly as entered.
        </p>
        <div id="meter-feedback" aria-live="polite" aria-atomic="true">
          {state === "error" && (
            <p className="meter-error" role="alert">
              {message}
            </p>
          )}
          {state === "loading" && (
            <p className="meter-help" aria-busy="true">
              Connecting to your meter provider…
            </p>
          )}
          {state === "valid" && result && (
            <div className="meter-result">
              <strong>
                <Icon name="check" size={16} /> Account found
              </strong>
              {result.customer_name && <p>{result.customer_name}</p>}
              {result.disco_name && <p>{result.disco_name}</p>}
              <p>
                This confirms the meter account. Live usage needs a supported
                connection.
              </p>
              <a href="/ir-reader/setup" className="btn btn-secondary">
                Explore a reader <Icon name="arrow" size={14} />
              </a>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
