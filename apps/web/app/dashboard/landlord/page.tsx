"use client";
import { hasSession } from "@/lib/session";
import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/AppShell";
import Icon from "@/components/Icon";
import { apiFetch } from "@/lib/api";
export default function Page() {
  const [buildings, setBuildings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    if (!hasSession()) {
      setLoading(false);
      return;
    }
    setAuthenticated(true);
    try {
      const d = await apiFetch("/buildings");
      setBuildings(d.items || []);
    } catch {
      setError(
        "We couldn’t load your buildings. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <AppShell role="landlord">
      <div className="overview-heading">
        <div>
          <span className="eyebrow">THE BIGGER PICTURE</span>
          <h1>Your buildings, in focus.</h1>
          <p>A little clarity for every room.</p>
        </div>
        {authenticated && (
          <a
            href="/dashboard/landlord/buildings/new"
            className="btn btn-primary"
          >
            Add a building <Icon name="arrow" size={16} />
          </a>
        )}
      </div>
      {error && (
        <div className="error-panel" role="alert">
          {error}
          <button className="btn btn-secondary" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}
      {loading ? (
        <div
          className="skeleton"
          aria-label="Loading buildings"
          aria-busy="true"
          style={{ height: 220 }}
        />
      ) : !authenticated ? (
        <div className="workspace-empty">
          <Icon name="building" size={38} />
          <h2>A home for your buildings.</h2>
          <p>Log in to manage your properties and their rooms.</p>
          <a href="/login" className="btn btn-primary">
            Log in <Icon name="arrow" size={16} />
          </a>
        </div>
      ) : !error && buildings.length === 0 ? (
        <div className="workspace-empty">
          <Icon name="building" size={40} />
          <h2>Make room for a clearer picture.</h2>
          <p>
            Add your first building, then create rooms and invite your
            residents.
          </p>
          <a
            href="/dashboard/landlord/buildings/new"
            className="btn btn-primary"
          >
            Add your first building
            <Icon name="arrow" size={16} />
          </a>
        </div>
      ) : (
        <div className="grid-12">
          {buildings.map((b) => (
            <article
              key={b.building_id || b.id}
              className="card building-card"
              style={{ gridColumn: "span 6" }}
            >
              <span className="outline-icon">
                <Icon name="building" />
              </span>
              <h2>{b.name}</h2>
              <p>{b.address}</p>
              <span className="badge badge-unknown">
                {b.meter_type === "with_meter"
                  ? "Central meter"
                  : "Meter setup to confirm"}
              </span>
              <div className="building-actions">
                <a
                  href={`/dashboard/landlord/buildings/${encodeURIComponent(b.building_id || b.id)}/rooms`}
                  className="btn btn-primary"
                >
                  Manage rooms <Icon name="arrow" size={16} />
                </a>
                <a href="/billing" className="text-link">
                  Billing
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
