"use client";
import { useEffect, useState, useCallback } from "react";
import PublicShell from "@/components/PublicShell";
import { apiFetch, formatNaira, formatKwh } from "@/lib/api";
export default function Page() {
  const [receipt, setReceipt] = useState<any>(null),
    [error, setError] = useState(""),
    [target, setTarget] = useState<{ id: string; token: string } | null>(null),
    [loading, setLoading] = useState(false),
    [confirming, setConfirming] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    let saved: any = {};
    try {
      saved = JSON.parse(sessionStorage.getItem("smartclamp_payment") || "{}");
    } catch {}
    const id = q.get("payment_id") || saved.payment_id,
      token =
        q.get("status_token") ||
        (saved.payment_id === id ? saved.status_token : "");
    if (id) setTarget({ id, token });
    else
      setError(
        "No payment reference was supplied. Open your receipt from billing.",
      );
    if (q.has("status_token"))
      history.replaceState(
        null,
        "",
        `/payments/return?payment_id=${encodeURIComponent(id)}`,
      );
  }, []);
  const refresh = useCallback(async () => {
    if (!target) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch(
        target.token
          ? `/public/payments/${encodeURIComponent(target.token)}`
          : `/payments/${encodeURIComponent(target.id)}`,
      );
      if (data.id !== target.id)
        throw new Error("The receipt does not match this payment.");
      setReceipt(data);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "We could not confirm the payment status.",
      );
    } finally {
      setLoading(false);
    }
  }, [target]);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 10000);
    return () => clearInterval(timer);
  }, [refresh]);
  return (
    <PublicShell>
      <div className="container marketing-page" style={{ maxWidth: 760 }}>
        <h1>Your payment receipt</h1>
        <p>
          These statuses come from the payment service. A checkout redirect
          alone is not proof of payment.
        </p>
        {error && (
          <div role="alert" className="error-panel">
            {error}
          </div>
        )}
        {loading && !receipt && <p role="status">Checking payment…</p>}
        {receipt && (
          <section className="card" aria-live="polite">
            <h2>
              {receipt.credit_state === "available"
                ? "Credit available"
                : receipt.payment_state === "verified"
                  ? "Payment received — delivery in progress"
                  : "Payment awaiting confirmation"}
            </h2>
            <p>Reference: {receipt.id}</p>
            <p>
              {formatNaira(receipt.amount_kobo)} ·{" "}
              {formatKwh(receipt.units_mwh)} quoted
            </p>
            <dl>
              <dt>Payment</dt>
              <dd>{receipt.payment_state}</dd>
              <dt>Meter delivery</dt>
              <dd>{receipt.vending_state}</dd>
              <dt>Credit</dt>
              <dd>{receipt.credit_state}</dd>
            </dl>
            {receipt.credit_state !== "available" && (
              <p>
                Do not pay again while this payment is being checked. Contact
                support with the reference if it stays unresolved.
              </p>
            )}
            {receipt.meter_token && (
              <div>
                <h3>Meter token</h3>
                <p style={{ overflowWrap: "anywhere" }}>
                  {receipt.meter_token}
                </p>
                <p>
                  Enter this token on your physical meter. Only confirm below
                  after the meter accepts it. Your confirmation is an
                  attestation, not a remote meter reading.
                </p>
                <button
                  className="btn btn-primary"
                  disabled={confirming}
                  onClick={async () => {
                    setConfirming(true);
                    setError("");
                    try {
                      await apiFetch(
                        `/payments/${receipt.id}/confirm-meter-entry`,
                        {
                          method: "POST",
                          body: JSON.stringify({ confirmed: true }),
                        },
                      );
                      await refresh();
                    } catch (e) {
                      setError(
                        e instanceof Error
                          ? e.message
                          : "Unable to confirm entry. Log in as the payer.",
                      );
                    } finally {
                      setConfirming(false);
                    }
                  }}
                >
                  The meter accepted my token
                </button>
              </div>
            )}
          </section>
        )}
        <div className="resource-actions">
          <button
            className="btn btn-secondary"
            disabled={loading || !target}
            onClick={() => void refresh()}
          >
            Refresh payment status
          </button>
          <a className="btn btn-primary" href="/billing">
            Open billing
          </a>
          <a className="btn btn-secondary" href="/support">
            Payment help
          </a>
        </div>
      </div>
    </PublicShell>
  );
}
