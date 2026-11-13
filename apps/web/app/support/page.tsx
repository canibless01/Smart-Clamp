"use client";
import { hasSession } from "@/lib/session";
import { useState, useRef, FormEvent } from "react";
import PublicShell from "@/components/PublicShell";
import Icon from "@/components/Icon";
import { apiFetch } from "@/lib/api";
export default function Page() {
  const [form, setForm] = useState({
    category: "device",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const key = useRef("");
  const body = useRef("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!form.subject.trim() || !form.message.trim()) {
      setError("Add a subject and a little detail so we can help.");
      return;
    }
    if (!hasSession()) {
      setError(
        "Please log in before opening a private support request. Your message is still here.",
      );
      return;
    }
    const payload = JSON.stringify(form);
    if (payload !== body.current) {
      key.current = crypto.randomUUID();
      body.current = payload;
    }
    setLoading(true);
    setError("");
    try {
      const d = await apiFetch("/support/tickets", {
        method: "POST",
        headers: { "Idempotency-Key": key.current },
        body: payload,
      });
      if (!d?.id)
        throw new Error(
          "We didn’t receive a request reference. Please try again.",
        );
      setReference(d.id);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "We couldn’t send your request. Your message is still here.",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <PublicShell>
      <div className="container marketing-page">
        <header className="marketing-heading">
          <span className="eyebrow">A LITTLE HELP GOES A LONG WAY</span>
          <h1>
            Let’s make
            <br />
            things clearer.
          </h1>
          <p>
            Something on your mind? Tell us what’s happening.
            <br />
            Please don’t include passwords or payment card details.
          </p>
        </header>
        <div className="support-layout">
          {reference ? (
            <div className="workspace-empty" role="status">
              <Icon name="check" size={38} />
              <h2>Request acknowledged.</h2>
              <p>The platform returned your reference:</p>
              <code className="support-reference">{reference}</code>
              <a
                href={`/support/tickets/${encodeURIComponent(reference)}`}
                className="btn btn-primary"
              >
                View request <Icon name="arrow" size={16} />
              </a>
            </div>
          ) : (
            <form className="card setup-form" onSubmit={submit}>
              <div>
                <label htmlFor="support-category">What can we help with?</label>
                <select
                  id="support-category"
                  className="input"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                >
                  {[
                    "device",
                    "payment",
                    "billing",
                    "installation",
                    "account",
                    "other",
                  ].map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="support-subject">A short summary</label>
                <input
                  id="support-subject"
                  className="input"
                  value={form.subject}
                  onChange={(e) =>
                    setForm({ ...form, subject: e.target.value })
                  }
                  maxLength={200}
                  placeholder="What’s happening?"
                  required
                />
              </div>
              <div>
                <label htmlFor="support-message">Tell us a little more</label>
                <textarea
                  id="support-message"
                  className="input"
                  value={form.message}
                  onChange={(e) =>
                    setForm({ ...form, message: e.target.value })
                  }
                  maxLength={4000}
                  rows={5}
                  placeholder="Describe the issue and when you noticed it."
                  required
                />
              </div>
              {error && (
                <div className="error-panel" role="alert">
                  {error} {!localStorageSafe() && <a href="/login">Log in →</a>}
                </div>
              )}
              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading}
              >
                {loading ? "Sending your request…" : "Send request"}
                <Icon name="arrow" size={16} />
              </button>
              <p className="auth-fineprint">
                Private support requests need an account. File attachments
                aren’t available in this form yet.
              </p>
            </form>
          )}
          <aside className="simple-feature-list">
            <div>
              <Icon name="help" />
              <h3>A quick answer might be here.</h3>
              <p>
                Common questions about meters, your setup and getting started.
              </p>
              <a href="/faqs" className="text-link">
                Explore FAQs <Icon name="arrow" size={15} />
              </a>
            </div>
            <div>
              <Icon name="plug" />
              <h3>Having connection trouble?</h3>
              <p>
                Your browser, device connection and electricity supply can each
                behave differently.
              </p>
              <a href="/connection-help" className="text-link">
                Connection help <Icon name="arrow" size={15} />
              </a>
            </div>
            <div>
              <Icon name="shield" />
              <h3>Electrical safety comes first.</h3>
              <p>
                If you notice burning smells, sparking or an immediate
                electrical hazard, contact qualified local electrical
                assistance. This form isn’t an emergency service.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </PublicShell>
  );
}
function localStorageSafe() {
  return (
    typeof window !== "undefined" && hasSession()
  );
}
