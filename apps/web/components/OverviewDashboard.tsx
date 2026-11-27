"use client";
import PowerControlPanel from "./PowerControlPanel";
import {useWorkspaceLive} from "./WorkspaceLiveProvider";
import { hasSession } from "@/lib/session";
import { useState, useEffect, useCallback } from "react";
import AppShell from "./AppShell";
import {ElectricalGauge,ElectricalTrends,SupplyFlow,RelayDial} from './EnergyInstruments';
import UsageChart from "./UsageChart";
import WalletCard from "./WalletCard";
import Icon from "./Icon";
import { apiFetch } from "@/lib/api";
export default function OverviewDashboard({
  role,
}: {
  role: "tenant" | "homeowner";
}) {
  const live=useWorkspaceLive();
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

    const refreshed = () => void load();
    window.addEventListener("smartclamp:session-updated", refreshed);
    return () => {window.removeEventListener("smartclamp:session-updated", refreshed);};
  }, [load]);
  useEffect(()=>{if(live.snapshot?.context.authorized_context?.role===role){setData(live.snapshot.context);setLoading(false);}},[live.snapshot,role]);
  const device = data?.devices?.[0];
  const measured = device?.measurement;
  const wallet = device?.wallet;
  const observed = measured?.observed_at;
  const fresh =
    observed &&
    Number.isFinite(Date.parse(observed)) &&
    Date.now() - Date.parse(observed) >= 0 && Date.now() - Date.parse(observed) < 180000;
  const readingStatus=!fresh?'stale':measured?.quality!=='valid'||device?.electrical?.clock_quality!=='trusted'?'Unverified reading':'fresh';
  const watts = measured?.value ?? data?.live_watts ?? null;
  const relay = device?.relay;
  const relayAge=relay?.observed_at?Date.now()-Date.parse(relay.observed_at):NaN,relayFresh=Number.isFinite(relayAge)&&relayAge>=0&&relayAge<180000,channels=device?.channel_manifest?.channels;
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
                {!device && (
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
                {!!device && !fresh && (
                  <div className="overview-note">
                    <Icon name="history" size={17} />
                    <span>
                      {observed
                        ? "These are last-recorded values, not confirmed live readings."
                        : "The connected API has not supplied device observation times. These values are unconfirmed."}
                    </span>
                  </div>
                )}
                {device?.capabilities?.includes('relay')&&(device.access?.can_control===true||device.controls?.can_request===true)&&<PowerControlPanel context={data} deviceId={device.id}/>}
                <SupplyFlow hasRelay={device?.capabilities?.includes('relay')===true} supply={fresh ? device?.supply_state : 'unknown'} relay={relayFresh ? relay?.observed ?? null : null} power={readingStatus==='fresh' ? watts : null}/>
                <div className="grid-12 overview-metrics">
                  <div style={{ gridColumn: "span 4" }}>
                    <WalletCard
                      available={balance}
                      availableEnergyMwh={wallet?.available_mwh??null}
                      reserved={wallet?.reserved ?? null}
                      ledgerVersion={wallet?.ledger_version}
                      updatedAt={wallet?.updated_at}
                    />
                  </div>
                  <div style={{ gridColumn: "span 4" }}>
                    <ElectricalGauge label="Real power" value={watts} unit="W" scale={1000} status={readingStatus}/>
                  </div>

                  {['voltage_v','current_a'].filter(key=>!channels||channels[key]).map((key) => <div style={{gridColumn:"span 6"}} key={key}>
                    <ElectricalGauge label={key==='voltage_v'?'Voltage':'Current'} value={device?.electrical?.[key] ?? null} unit={key==='voltage_v'?'V':'A'} scale={channels?.[key]?.range?.[1]??(key==='voltage_v'?300:10)} status={readingStatus!=='fresh'?readingStatus:key==='voltage_v'&&['low','high'].includes(device?.electrical?.voltage_status)?device.electrical.voltage_status:'fresh'}/>
                  </div>)}
                  {['low','high'].includes(device?.electrical?.voltage_status) && <div className="overview-note" role="status" style={{gridColumn:"span 12"}}>Voltage is {device.electrical.voltage_status==='low'?'below':'above'} your configured advisory band ({device.electrical.warning_band.low_v}–{device.electrical.warning_band.high_v} V). This display warning does not confirm a protective switch action.</div>}
                  <div style={{gridColumn:"span 12"}}><ElectricalTrends samples={data?.electrical_history || []}/></div>
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
