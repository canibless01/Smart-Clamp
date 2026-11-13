"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Icon, { Brand, IconName } from "./Icon";
import { useWorkspaceSession } from "./useWorkspaceSession";
const common = [
  { label: "Usage history", href: "/history", icon: "chart" },
  { label: "Wallet & bills", href: "/billing", icon: "wallet" },
  { label: "Notifications", href: "/alerts", icon: "bell" },
];
const groups: Record<string, { label: string; href: string; icon: string }[]> =
  {
    tenant: [
      { label: "Overview", href: "/dashboard/tenant", icon: "home" },
      ...common,
      { label: "Control", href: "/control", icon: "bolt" },
      { label: "Community", href: "/community", icon: "building" },
    ],
    homeowner: [
      { label: "Overview", href: "/dashboard/homeowner", icon: "home" },
      ...common,
      { label: "Control", href: "/control", icon: "bolt" },
    ],
    landlord: [
      {
        label: "Your buildings",
        href: "/dashboard/landlord",
        icon: "building",
      },
      ...common,
      { label: "Community", href: "/community", icon: "home" },
    ],
    nepa_staff: [
      {
        label: "Community overview",
        href: "/dashboard/utility",
        icon: "building",
      },
      { label: "Notifications", href: "/alerts", icon: "bell" },
      { label: "Service messages", href: "/communications", icon: "bell" },
    ],
    installer: [
      { label: "Your assignments", href: "/portal", icon: "plug" },
      { label: "Installation", href: "/install", icon: "meter" },
    ],
    agent: [{ label: "Your portal", href: "/portal", icon: "chart" }],
    referrer: [{ label: "Your portal", href: "/portal", icon: "chart" }],
  };
export default function AppShell({
  children,
  role = "tenant",
}: {
  children: React.ReactNode;
  role?: string;
}) {
  const path = usePathname();
  const session = useWorkspaceSession();
  role = session.role || role;
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  if (session.status === "checking") return <main id="main" className="container marketing-page"><p role="status">Checking your saved sign-in…</p></main>;
  if (session.status === "unavailable") return <main id="main" className="container marketing-page"><h1>We couldn’t verify your workspace.</h1><p role="alert">Your saved sign-in has been retained. Check your connection and retry.</p><button className="btn btn-primary" onClick={() => void session.retry()}>Try again</button><a className="btn btn-secondary" href="/">SmartClamp home</a></main>;
  const internal = role.startsWith("internal_");
  const items = internal
    ? [
        ...(role !== 'internal_support' ? [{ label: "Operations", href: "/ops", icon: "chart" }] : []),
        ...(['internal_ops','internal_support','internal_superadmin'].includes(role) ? [{label:'Service messages',href:'/communications',icon:'bell'}] : []),
        ...(role === "internal_engineering" || role === "internal_superadmin" ? [{ label: "Firmware", href: "/ops/firmware", icon: "plug" }] : []),
      ]
    : groups[role] || [{ label: "Home", href: "/", icon: "home" }];
  const current = items.find((i) => path === i.href)?.label || "Workspace";
  const mobile = role === "tenant" || role === "homeowner" ? [items[0], items.find(i => i.href === "/history")!, items.find(i => i.href === "/control")!, items.find(i => i.href === "/billing")!, { label: "Settings", href: "/settings", icon: "settings" }] : [
    ...items.slice(0, 3),
    { label: "Settings", href: "/settings", icon: "settings" },
  ];
  return (
    <div className="main-with-sidebar">
      <aside
        className="sidebar"
        style={{ display: "flex", flexDirection: "column" }}
        aria-label="Workspace navigation"
      >
        <Link
          href="/"
          className="app-sidebar-brand"
          aria-label="SmartClamp home"
        >
          <Brand />
        </Link>
        <div className="app-role-label">
          YOUR WORKSPACE · {role.replace(/_/g, " ")}
        </div>
        <nav className="app-nav" aria-label="App navigation">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              aria-current={path === i.href ? "page" : undefined}
            >
              <Icon name={i.icon as IconName} />
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="app-sidebar-bottom">
          <nav className="app-nav" aria-label="Account navigation">
            <Link
              href="/settings"
              aria-current={path === "/settings" ? "page" : undefined}
            >
              <Icon name="settings" />
              Settings
            </Link>
            <Link href="/support">
              <Icon name="help" />
              Help & support
            </Link>
          </nav>
        </div>
      </aside>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {!online && (
          <div className="offline-banner app-offline" role="status">
            Your browser is offline. Displayed readings may be out of date.
            <Link href="/connection-help">Connection help</Link>
          </div>
        )}
        <header className="app-header">
          <div className="app-breadcrumb">
            <Icon name="home" size={16} />
            <span>/</span>
            <span>{current}</span>
          </div>
          <div className="app-header-actions">
            <span className="app-browser-status">
              <span className={`status-dot ${online ? "" : "off"}`} />
              {online ? "Browser connected" : "Browser offline"}
            </span>
            <Link
              href="/alerts"
              className="icon-button"
              aria-label="Notifications"
            >
              <Icon name="bell" size={18} />
            </Link>
            <Link
              href="/settings"
              className="app-avatar"
              aria-label="Account settings"
            >
              SC
            </Link>
          </div>
        </header>
        <main id="main" className="main-content">
          {children}
        </main>
        <nav
          className="bottom-nav desktop-hidden"
          aria-label="Mobile navigation"
        >
          {mobile.map((i) => (
            <Link
              href={i.href}
              key={i.href}
              aria-current={path === i.href ? "page" : undefined}
            >
              <Icon name={i.icon as IconName} />
              {i.label === "Usage history"
                ? "History"
                : i.label === "Wallet & bills"
                  ? "Wallet"
                  : i.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
