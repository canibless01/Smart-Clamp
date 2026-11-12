"use client";
import { useState, useEffect, useCallback } from "react";
import AppShell from "./AppShell";
import UsageChart from "./UsageChart";
import WalletCard from "./WalletCard";
import { LiveMetric, StatusBadge } from "./LiveMetric";
import Icon from "./Icon";
import { apiFetch } from "@/lib/api";
export default function OverviewDashboard({
  role,
}: {
  role: "tenant" | "homeowner";
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [auth, setAuth] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    if (!localStorage.getItem("smartclamp_token")) {
      setAuth(true);
      setLoading(false);
      return;
    }
    try {
      setData(await apiFetch(`/dashboard/${role}`));
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "We couldn’t load your overview. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [role]);
  useEffect(() => {
    void load();
  }, [load]);
  const device = data?.devices?.[0];
  const measured = device?.measurement;
  const wallet = device?.wallet;
  const observed = measured?.observed_at;
  const fresh =
    observed &&
    Number.isFinite(Date.parse(observed)) &&
    Date.now() - Date.parse(observed) < 180000;
  const watts = measured?.value ?? data?.live_watts ?? null;
  const relay = device?.relay;
  const hasControl =
    fresh &&
    device?.capabilities?.includes("relay") &&
    data?.allowed_actions?.includes("relay_toggle");
  const balance =
    wallet?.available ??
    (typeof data?.wallet_balance === "number"
      ? Math.round(data.wallet_balance * 100)
      : null);
  return (
    <AppShell role={role}>
      <div className="overview-heading">
        <div>
          <span className="eyebrow">YOUR ENERGY, IN PERSPECTIVE</span>
          <h1>A clearer view of home.</h1>
          <p>
            {role === "tenant"
              ? "Your room. Your usage. Your peace of mind."
              : "A little insight into the electricity behind your everyday."}
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => void load()}
          disabled={loading}
        >
          <Icon name="history" size={15} />
          {loading ? "Updating…" : "Refresh"}
        </button>
      </div>
      {auth ? (
        <div className="workspace-empty">
          <Icon name="home" size={38} />
          <h2>Your home is waiting.</h2>
          <p>
            Log in to see the devices and readings connected to your account.
          </p>
          <a href="/login" className="btn btn-primary">
            Log in <Icon name="arrow" size={16} />
          </a>
        </div>
      ) : (
        <>
          {error && (
            <div className="error-panel" role="alert">
              We couldn’t update your overview. Check your connection and try
              Refresh. {data ? "Existing values may be out of date." : ""}
            </div>
          )}
          {loading && !data ? (
            <div
              className="grid-12"
              aria-busy="true"
              aria-label="Loading your overview"
            >
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="skeleton"
                  style={{ gridColumn: "span 4", height: 190 }}
                />
              ))}
            </div>
          ) : (
            data && (
              <>
                {!fresh && (
                  <div className="overview-note">
                    <Icon name="history" size={17} />
                    <span>
                      {observed
                        ? "These are last-recorded values, not confirmed live readings."
                        : "The connected API has not supplied device observation times. These values are unconfirmed."}
                    </span>
                  </div>
                )}
                <StatusBadge
                  supply={fresh ? device?.supply_state : "unknown"}
                  connectivity={fresh ? device?.connectivity : "unknown"}
                  relay={{ observed: fresh ? relay?.observed : null }}
                />
                <div className="grid-12 overview-metrics">
                  <div style={{ gridColumn: "span 4" }}>
                    <WalletCard
                      available={balance}
                      reserved={wallet?.reserved ?? null}
                      ledgerVersion={wallet?.ledger_version}
                      updatedAt={wallet?.updated_at}
                    />
                  </div>
                  <div style={{ gridColumn: "span 4" }}>
                    <LiveMetric
                      label={fresh ? "Power right now" : "Last recorded power"}
                      value={watts}
                      unit={measured?.unit || "W"}
                      observedAt={observed}
                      quality={measured?.quality || "unknown"}
                      coverage={measured?.coverage}
                    />
                  </div>
                  <div style={{ gridColumn: "span 4" }}>
                    <LiveMetric
                      label="Observed relay state"
                      value={
                        relay?.observed === true
                          ? "ON"
                          : relay?.observed === false
                            ? "OFF"
                            : data?.relay_state === true
                              ? "ON"
                              : data?.relay_state === false
                                ? "OFF"
                                : null
                      }
                      unit=""
                      observedAt={relay?.observed_at}
                      quality="observed"
                    />
                  </div>
                  <div style={{ gridColumn: "span 8" }}>
                    <UsageChart data={data?.usage_history} />
                  </div>
                  <div style={{ gridColumn: "span 4" }}>
                    <div className="card overview-shortcuts">
                      <span className="eyebrow">YOUR NEXT STEP</span>
                      <h3>A little more clarity.</h3>
                      <a href="/history">
                        <span>
                          <Icon name="chart" />
                          Explore your usage
                        </span>
                        <Icon name="arrow" size={15} />
                      </a>
                      <a href="/billing">
                        <span>
                          <Icon name="wallet" />
                          Understand your bill
                        </span>
                        <Icon name="arrow" size={15} />
                      </a>
                      <a href="/alerts">
                        <span>
                          <Icon name="bell" />
                          View notifications
                        </span>
                        <Icon name="arrow" size={15} />
                      </a>
                      {hasControl && (
                        <a href="/control">
                          <span>
                            <Icon name="bolt" />
                            Manage your power
                          </span>
                          <Icon name="arrow" size={15} />
                        </a>
                      )}
                    </div>
                    <div className="overview-help">
                      <Icon name="help" />
                      <p>
                        Something doesn’t look right?
                        <br />
                        <a href="/support">We’re here to help.</a>
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )
          )}
        </>
      )}
    </AppShell>
  );
}
