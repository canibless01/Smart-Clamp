"use client";
import { useEffect, useState } from "react";
import RecordWorkspace from "@/components/RecordWorkspace";
import { apiFetch, logout } from "@/lib/api";
import PhoneEnrollment from '@/components/PhoneEnrollment';
import PwaControls from '@/components/PwaControls';
export default function Page() {
  const [prefs, setPrefs] = useState<any>(null),
    [smsAvailable, setSmsAvailable] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    apiFetch("/users/me/preferences")
      .then((d) => { setPrefs(d.value); setSmsAvailable(d.notification_channels?.sms === true); })
      .catch((e) => setMessage(e.message));
  }, []);
  return (
    <RecordWorkspace
      title="Your account"
      description="Your profile and saved preferences."
      endpoint="/users/me/context"
    >
      {(data) => (
        <>
          <section className="card">
            <h2>Profile</h2>
            <dl>
              <dt>Name</dt>
              <dd>{data.authorized_context.full_name}</dd>
              <dt>Phone</dt>
              <dd>{data.authorized_context.phone || 'Not verified'}</dd>
              <dt>Email</dt>
              <dd>{data.authorized_context.email || 'Not linked'}</dd>
              <dt>Workspace</dt>
              <dd>{data.authorized_context.role}</dd>
              <dt>Plan</dt>
              <dd>{data.authorized_context.subscription_tier}</dd>
            </dl>
            <a className="btn btn-secondary" href="/support">
              Request an account change
            </a>
          </section>
          {!data.authorized_context.phone && <PhoneEnrollment/>}
          <section className="card" style={{ marginTop: 24 }}>
            <h2>Preferences</h2>
            {prefs && (
              <form
                className="resource-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await apiFetch("/users/me/preferences", {
                      method: "PATCH",
                      body: JSON.stringify({language:prefs.language || 'en',sms_enabled:prefs.sms_enabled === true,utility_notices_enabled:prefs.utility_notices_enabled === true}),
                    });
                    setMessage("Preferences saved.");
                  } catch (e) {
                    setMessage(
                      e instanceof Error ? e.message : "Unable to save.",
                    );
                  }
                }}
              >
                <label>
                  Language
                  <select
                    className="input"
                    value={prefs.language || "en"}
                    onChange={(e) =>
                      setPrefs({ ...prefs, language: e.target.value })
                    }
                  >
                    <option value="en">English</option>
                  </select>
                </label>
                <p>
                  In-app notifications are available. {smsAvailable ? "SMS is available for account events. Provider acceptance does not confirm handset delivery." : "SMS is unavailable until the delivery provider is activated."} Email event delivery remains unavailable. Browser notifications are managed below.
                </p>
                <label><input type="checkbox" checked={prefs.sms_enabled === true} disabled={!smsAvailable} onChange={e => setPrefs({ ...prefs, sms_enabled: e.target.checked })} /> Send account events to my phone by SMS</label>
                <label><input type="checkbox" checked={prefs.utility_notices_enabled === true} onChange={e=>setPrefs({...prefs,utility_notices_enabled:e.target.checked})}/> Allow service notices from the reviewed utility organization assigned to my device</label>
                <button className="btn btn-primary">Save preferences</button>
              </form>
            )}
            {message && <p role="status">{message}</p>}
          </section>
          <PwaControls/>
          <div className="resource-actions">
            <a className="btn btn-secondary" href="/devices/link">
              Link another SmartClamp
            </a>
            <a className="btn btn-secondary" href="/pricing#compare">
              Explore plans
            </a>
            <button className="btn btn-secondary" onClick={() => void logout()}>
              Log out
            </button>
          </div>
        </>
      )}
    </RecordWorkspace>
  );
}
