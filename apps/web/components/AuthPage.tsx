"use client";
import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import PublicShell from "./PublicShell";
import Icon, { IconName } from "./Icon";
import { API_BASE } from "@/lib/api";
import { storeSession, safeReturnPath } from "@/lib/session";
const homes: Record<string, string> = {
  tenant: "/dashboard/tenant",
  landlord: "/dashboard/landlord",
  homeowner: "/dashboard/homeowner",
  nepa_staff: "/dashboard/utility",
  installer: "/portal",
  agent: "/portal",
  referrer: "/portal",
  internal_ops: "/ops",
  internal_finance: "/ops",
  internal_support: "/ops",
  internal_engineering: "/ops",
  internal_superadmin: "/ops",
};
export default function AuthPage({ signup = false }: { signup?: boolean }) {
  const [ready, setReady] = useState(false);
  const [returnTo, setReturnTo] = useState("");
  useEffect(() => { setReady(true); setReturnTo(new URLSearchParams(location.search).get("next") || ""); }, []);
  const [form, setForm] = useState({
    phone: "",
    password: "",
    full_name: "",
    role: "homeowner",
  });
  const [loading, setLoading] = useState(false);
  const [verification, setVerification] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (signup) {
      const role = new URLSearchParams(location.search).get("setup");
      if (role && ["landlord", "tenant", "homeowner"].includes(role))
        setForm((f) => ({ ...f, role }));
    }
  }, [signup]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    const next: Record<string, string> = {};
    if (!/^\+[1-9][0-9]{7,14}$/.test(form.phone.trim()))
      next.phone =
        "Enter your phone with its country code, e.g. +2348012345678.";
    if (verification && !/^\d{6,10}$/.test(code))
      next.code = "Enter the code sent to your phone.";
    if (signup && form.password.length < 8)
      next.password = "Use at least 8 characters.";
    if (!signup && !form.password) next.password = "Enter your password.";
    if (signup && !form.full_name.trim())
      next.full_name = "Please enter your full name.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    setError("");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(
        `${API_BASE}/auth/${verification ? "verify" : signup ? "signup" : "login"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            verification
              ? { phone: form.phone, code }
              : signup
                ? form
                : { phone: form.phone, password: form.password },
          ),
          signal: controller.signal,
        },
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          res.status === 409
            ? "This phone is already registered. Try logging in."
            : data.message ||
              (signup
                ? "We couldn’t create your account. Please try again."
                : "We couldn’t sign you in. Check your details and try again."),
        );
      if (res.status === 202 && data.status === "verification_required") {
        setVerification(true);
        setLoading(false);
        return;
      }
      if (!data.access_token || !homes[data.role])
        throw new Error(
          "Your account needs a supported workspace. Please contact support.",
        );
      storeSession(data);
      const invitation = sessionStorage.getItem("smartclamp_invitation");
      location.assign(
        invitation && data.role === "tenant"
          ? `/join?token=${encodeURIComponent(invitation)}`
          : safeReturnPath(new URLSearchParams(location.search).get("next"), homes[data.role]),
      );
    } catch (err) {
      setError(
        controller.signal.aborted
          ? "The connection took too long. Please try again."
          : err instanceof Error
            ? err.message
            : "We couldn’t connect. Check your internet and try again.",
      );
      setLoading(false);
    } finally {
      clearTimeout(timer);
    }
  }
  return (
    <PublicShell>
      <div className="auth-layout">
        <div className="auth-story">
          <Image
            src="/images/energy-home.png"
            alt="Illustrative warmly lit home at dusk"
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            priority
          />
          <span className="eyebrow">YOUR POWER. IN PERSPECTIVE.</span>
          <h2>
            {signup
              ? "A clearer picture starts with you."
              : "A little more peace of mind."}
          </h2>
          <p>
            Understand your usage, keep your bills in perspective, and make room
            for the things that matter.
          </p>
        </div>
        <div className="auth-panel">
          <span className="eyebrow">
            {signup ? "MAKE YOURSELF AT HOME" : "WELCOME BACK"}
          </span>
          <h1>{signup ? "Let’s get you started." : "Your home, in focus."}</h1>
          <p>
            {signup
              ? "First, tell us a little about your setup."
              : "Log in to pick up where you left off."}
          </p>
          {signup && (
            <div
              className="auth-role-options"
              role="group"
              aria-label="Choose your setup"
            >
              {[
                { name: "My home", value: "homeowner", icon: "home" },
                { name: "My room", value: "tenant", icon: "bulb" },
                { name: "My building", value: "landlord", icon: "building" },
              ].map((r) => (
                <button
                  type="button"
                  key={r.value}
                  onClick={() => setForm({ ...form, role: r.value })}
                  aria-pressed={form.role === r.value}
                >
                  <Icon name={r.icon as IconName} />
                  {r.name}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={submit}
            className="auth-form"
            noValidate
            aria-label={signup ? "Create your account" : "Log in"}
          >
            {signup && (
              <div>
                <label htmlFor="full-name">Full name</label>
                <input
                  className="input"
                  disabled={!ready}
                  id="full-name"
                  autoComplete="name"
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({ ...form, full_name: e.target.value })
                  }
                  placeholder="Your name"
                  aria-invalid={!!errors.full_name}
                  aria-describedby={errors.full_name ? "name-error" : undefined}
                />
                {errors.full_name && (
                  <span id="name-error" className="meter-error" role="alert">
                    {errors.full_name}
                  </span>
                )}
              </div>
            )}
            <div>
              <label htmlFor="phone">Phone number</label>
              <input
                className="input"
                disabled={!ready}
                id="phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+234 801 234 5678"
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "phone-error" : undefined}
              />
              {errors.phone && (
                <span id="phone-error" className="meter-error" role="alert">
                  {errors.phone}
                </span>
              )}
            </div>
            <div>
              <label htmlFor="password">Password</label>
              <div className="password-field">
                <input
                  className="input"
                  disabled={!ready}
                  id="password"
                  autoComplete={signup ? "new-password" : "current-password"}
                  type={show ? "text" : "password"}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder={
                    signup ? "At least 8 characters" : "Enter your password"
                  }
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>
              {errors.password && (
                <span id="password-error" className="meter-error" role="alert">
                  {errors.password}
                </span>
              )}
            </div>
            {verification && (
              <div>
                <label htmlFor="verification-code">
                  Phone verification code
                </label>
                <input
                  id="verification-code"
                  className="input"
                  disabled={!ready}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                {errors.code && <p role="alert">{errors.code}</p>}
                <p>
                  Enter the code sent to your phone to finish creating your
                  account.
                </p>
              </div>
            )}
            {error && (
              <div className="error-panel" role="alert">
                {error}
              </div>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!ready || loading}
            >
              {verification
                ? loading
                  ? "Verifying…"
                  : "Verify my phone"
                : loading
                  ? signup
                    ? "Creating your account…"
                    : "Signing you in…"
                  : signup
                    ? "Create my account"
                    : "Log in"}
              <Icon name="arrow" size={17} />
            </button>
            <div className="auth-links">
              {!signup && (
                <Link href="/account/recovery">Forgot your password?</Link>
              )}
              <span>
                {signup ? "Already at home here?" : "New to SmartClamp?"}{" "}
                <Link
                  className="auth-switch"
                  href={`${signup ? "/login" : "/signup"}${returnTo ? `?next=${encodeURIComponent(returnTo)}` : ""}`}
                >
                  {signup ? "Log in" : "Get started"}{" "}
                  <Icon name="arrow" size={15} />
                </Link>
              </span>
            </div>
            {signup && (
              <p className="auth-fineprint">
                By creating an account, you agree to our{" "}
                <Link href="/terms">terms</Link> and{" "}
                <Link href="/privacy">privacy policy</Link>. Professional and
                utility accounts need an invitation from our team.
              </p>
            )}
          </form>
        </div>
      </div>
    </PublicShell>
  );
}
