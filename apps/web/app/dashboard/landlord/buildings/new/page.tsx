"use client";
import { hasSession } from "@/lib/session";
import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import Icon from "@/components/Icon";
import { apiFetch } from "@/lib/api";
export default function Page() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    address: "",
    meter_type: "with_meter",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const key = useRef("");
  const body = useRef("");
  useEffect(
    () => setAuthenticated(hasSession()),
    [],
  );
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!form.name.trim() || !form.address.trim()) {
      setError("Give your building a name and address to continue.");
      return;
    }
    const payload = JSON.stringify({
      ...form,
      name: form.name.trim(),
      address: form.address.trim(),
    });
    if (payload !== body.current) {
      key.current = crypto.randomUUID();
      body.current = payload;
    }
    setLoading(true);
    setError("");
    try {
      const result = await apiFetch("/buildings", {
        method: "POST",
        headers: { "Idempotency-Key": key.current },
        body: payload,
      });
      const id = result?.building_id || result?.id;
      if (!id)
        throw new Error(
          "The server did not return a building reference. Please contact support.",
        );
      router.push(
        `/dashboard/landlord/buildings/${encodeURIComponent(id)}/rooms`,
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "We couldn’t create the building. Please try again.",
      );
      setLoading(false);
    }
  }
  return (
    <AppShell role="landlord">
      <div className="overview-heading">
        <div>
          <span className="eyebrow">MAKE ROOM FOR CLARITY</span>
          <h1>Let’s meet your building.</h1>
          <p>Start with the basics. You can add rooms next.</p>
        </div>
        <a href="/dashboard/landlord" className="text-link">
          Back to buildings
        </a>
      </div>
      {!authenticated ? (
        <div className="workspace-empty">
          <Icon name="building" size={36} />
          <h2>Your building starts here.</h2>
          <p>Log in with your landlord account to add a building.</p>
          <a href="/login" className="btn btn-primary">
            Log in <Icon name="arrow" size={16} />
          </a>
        </div>
      ) : (
        <form onSubmit={submit} className="card setup-form">
          <div>
            <label htmlFor="building-name">Building name</label>
            <input
              id="building-name"
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Cedar House"
              maxLength={150}
              required
            />
          </div>
          <div>
            <label htmlFor="building-address">Address</label>
            <textarea
              id="building-address"
              className="input"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Street, area and city"
              maxLength={1000}
              rows={3}
              required
            />
          </div>
          <div className="setup-meter">
            <Icon name="meter" />
            <div>
              <strong>With an existing central meter</strong>
              <p>
                The initial shared-building setup uses an existing central
                meter. Contact our team to discuss a building without one.
              </p>
            </div>
          </div>
          {error && (
            <div className="error-panel" role="alert">
              {error}
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Creating your building…" : "Continue to rooms"}
            <Icon name="arrow" size={16} />
          </button>
        </form>
      )}
    </AppShell>
  );
}
