"use client";
import { hasSession } from "@/lib/session";
import { useState, useEffect, useCallback } from "react";
import AppShell from "./AppShell";
import {ElectricalGauge,ElectricalTrends,SupplyFlow,RelayDial} from './EnergyInstruments';
import HomeInstrumentPanel from "./HomeInstrumentPanel";
import UsageChart from "./UsageChart";
import WalletCard from "./WalletCard";
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
  const load = useCallback(async (quiet=false) => {
    if(!quiet)setLoading(true);
    setError("");
    if (!hasSession()) {
      setAuth(true);
      setLoading(false);
      return;
    }
    try {
      setAuth(false);
      setData(await apiFetch(`/dashboard/${role}`));
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "We couldn’t load your overview. Please try again.",
      );
    } finally {
      if(!quiet)setLoading(false);
    }
  }, [role]);
  useEffect(() => {
    void load();
    const timer=setInterval(()=>{if(document.visibilityState==='visible')void load(true);},15000);
    const refreshed = () => void load();
    window.addEventListener("smartclamp:session-updated", refreshed);
    return () => {clearInterval(timer);window.removeEventListener("smartclamp:session-updated", refreshed);};
  }, [load]);
  return (
    <AppShell role={role}>
      <div className="overview-heading instrument-overview-heading">
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
                {!data.devices?.length && (
                  <div className="workspace-empty">
                    <h2>Connect your home.</h2>
                    <p>
                      Link your SmartClamp to begin receiving measurements.
                      Residents can join using their landlord’s invitation.
                    </p>
                    <a className="btn btn-primary" href="/devices/link">
                      Link my SmartClamp
                    </a>
                  </div>
                )}
                <HomeInstrumentPanel data={data}/>

              </>
            )
          )}
        </>
      )}
    </AppShell>
  );
}
