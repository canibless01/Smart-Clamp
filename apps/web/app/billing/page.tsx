"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch, formatNaira, formatKwh } from "@/lib/api";
import { RecordTable } from "@/components/RecordWorkspace";
export default function Page() {
  const [wallets, setWallets] = useState<any[]>([]),
    [selected, setSelected] = useState(""),
    [amount, setAmount] = useState(""),
    [email, setEmail] = useState(""),
    [quote, setQuote] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [payments, setPayments] = useState<any[]>([]);
  useEffect(() => {
    Promise.all([apiFetch("/wallets"), apiFetch("/transactions")])
      .then(([w, p]) => {
        setWallets(w.items);
        setSelected(w.items[0]?.id || "");
        setPayments(p.items);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoaded(true));
  }, []);
  const wallet = wallets.find((w) => w.id === selected);
  async function checkout() {
    if (!quote || busy) return;
    setBusy(true);
    setError("");
    try {
      const p = await apiFetch("/payments/checkout", {
        method: "POST",
        body: JSON.stringify({
          quote_id: quote.id,
          payer_email: email,
          return_path: "/payments/return",
        }),
      });
      sessionStorage.setItem(
        "smartclamp_payment",
        JSON.stringify({ payment_id: p.id, status_token: p.status_token }),
      );
      if (p.checkout_url) {
        const u = new URL(p.checkout_url);
        if (u.protocol !== "https:" || u.hostname !== "checkout.paystack.com")
          throw new Error("The checkout URL could not be verified.");
        location.assign(u.href);
      } else
        location.assign(
          `/payments/return?payment_id=${encodeURIComponent(p.id)}&status_token=${encodeURIComponent(p.status_token)}`,
        );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Checkout could not be started. Retry this quote to recover its existing payment.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AppShell>
      <h1>Wallet & electricity payments</h1>
      <p>
        Review your destination, approved tariff and fees before opening secure
        checkout.
      </p>
      {error && (
        <div className="error-panel" role="alert">
          {error}
        </div>
      )}
      {!loaded ? (
        <p role="status">Loading your wallets…</p>
      ) : !wallets.length ? (
        <div className="workspace-empty">
          <h2>No payment destination linked yet.</h2>
          <p>
            Link a meter account or an installed SmartClamp with an approved billing destination.
          </p>
          <a className="btn btn-primary" href="/devices/link">
            Link SmartClamp
          </a>
          <a className="btn btn-secondary" href="/meters/link">Link a meter account</a>
        </div>
      ) : (
        <section className="card">
          <form
            className="resource-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                if (!/^\d+(\.\d{1,2})?$/.test(amount))
                  throw new Error(
                    "Enter an amount in naira, with up to two decimal places.",
                  );
                const [whole, fraction = ""] = amount.split(".");
                const kobo =
                  Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
                setQuote(
                  await apiFetch("/payments/quotes", {
                    method: "POST",
                    body: JSON.stringify({
                      destination_token: wallet.payment_token,
                      amount_kobo: kobo,
                      utility_type: "electricity",
                    }),
                  }),
                );
              } catch (e) {
                setError(e instanceof Error ? e.message : "Unable to quote.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Payment destination
              <select
                className="input"
                value={selected}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setQuote(null);
                }}
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.balance_kind === "meter_purchases" ? `Meter ending ${w.meter_hint}` : `SmartClamp ${w.device_id}`}
                  </option>
                ))}
              </select>
            </label>
            {wallet.balance_kind === "meter_purchases" ? <p>Delivered purchase total: {formatKwh(wallet.available_mwh)}. Your meter’s remaining balance and usage are unknown without a supported reader.</p> : <p>
              Available: {formatNaira(wallet.available_kobo)} ·{" "}
              {formatKwh(wallet.available_mwh)}. Reserved:{" "}
              {formatNaira(wallet.reserved_kobo)}.
            </p>}
            <label>
              Amount in naira
              <input
                className="input"
                required
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setQuote(null);
                }}
              />
            </label>
            <label>
              Receipt email
              <input
                className="input"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "Please wait…" : "Get itemized quote"}
            </button>
          </form>
          {quote && (
            <div className="resource-list">
              <h2>Your quote</h2>
              <dl>
                <dt>Total charge</dt>
                <dd>{formatNaira(quote.amount_kobo)}</dd>
                <dt>Electricity value</dt>
                <dd>{formatNaira(quote.wallet_value_kobo)}</dd>
                <dt>Provider fee</dt>
                <dd>{formatNaira(quote.fee_kobo)}</dd>
                <dt>Platform markup</dt>
                <dd>{formatNaira(quote.markup_kobo)}</dd>
                <dt>Quoted energy</dt>
                <dd>{formatKwh(quote.units_mwh)} estimated</dd>
              </dl>
              <p>Destination: {quote.service_id} · meter ending {quote.meter_hint}. The provider confirms the actual vended units after payment.</p>
              <p>
                Tariff: {quote.tariff_version}. Expires{" "}
                {new Date(quote.expires_at).toLocaleString()}.
              </p>
              <button
                className="btn btn-primary"
                disabled={busy || Date.parse(quote.expires_at) <= Date.now()}
                onClick={() => void checkout()}
              >
                Continue to secure checkout
              </button>
              <p>
                Returning from checkout does not confirm payment. Your receipt
                shows payment, meter delivery and credit separately.
              </p>
            </div>
          )}
        </section>
      )}
      <section className="card" style={{ marginTop: 24 }}>
        <h2>Your payment history</h2>
        <RecordTable
          items={payments}
          columns={[
            {
              key: "id",
              label: "Receipt",
              render: (r) => (
                <a
                  className="text-link"
                  href={`/payments/return?payment_id=${r.id}`}
                >
                  {r.id.slice(0, 8)}
                </a>
              ),
            },
            {
              key: "amount_kobo",
              label: "Amount",
              render: (r) => formatNaira(r.amount_kobo),
            },
            { key: "payment_state", label: "Payment" },
            { key: "credit_state", label: "Credit" },
          ]}
        />
      </section>
    </AppShell>
  );
}
