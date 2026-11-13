import { test, expect } from "@playwright/test";
import fs from "node:fs";

test("private workspace and installation linking redirect guests before showing the dashboard", async ({ page }) => {
  await page.goto("/"); await page.getByRole("contentinfo").getByRole("link", { name: "Installation", exact: true }).click();
  await page.getByRole("link", { name: "Link an installed SmartClamp", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fdevices%2Flink/);
  await expect(page.getByRole("complementary", { name: "Workspace navigation" })).toHaveCount(0);
  for (const path of ["/dashboard/homeowner", "/billing", "/control", "/ops", "/settings"]) {
    await page.goto(path); await expect(page).toHaveURL(/\/login\?next=/);
    await expect(page.getByRole("complementary", { name: "Workspace navigation" })).toHaveCount(0);
  }
});

test("wallet setup actions are separated and homeowner mobile navigation includes Control", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("smartclamp_token", "ui-fixture-token"));
  await page.route("**/api/v1/users/me/context", r => r.fulfill({ json: { authorized_context: { role: "homeowner" }, devices: [] } }));
  for (const p of ["wallets", "transactions"]) await page.route(`**/api/v1/${p}`, r => r.fulfill({ json: { items: [] } }));
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 }); await page.goto("/billing");
    const a = await page.getByRole("link", { name: "Link SmartClamp", exact: true }).boundingBox();
    const b = await page.getByRole("link", { name: "Link a meter account", exact: true }).boundingBox();
    expect(a && b).toBeTruthy(); expect(b!.x >= a!.x + a!.width + 8 || b!.y >= a!.y + a!.height + 8).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  await expect(page.getByRole("navigation", { name: "Mobile navigation", exact: true }).getByRole("link", { name: "Control", exact: true })).toBeVisible();
});

const fixture = process.env.SMARTCLAMP_BROWSER_FIXTURE;
test("real auth/database: expired access refreshes once, survives navigation and returns to requested linking page", async ({ page }) => {
  test.skip(!fixture, "Requires isolated real GoTrue/API/database services."); const f = JSON.parse(fs.readFileSync(fixture!, "utf8"));
  await page.goto("/devices/link"); await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByLabel("Phone number").fill(f.owner.phone); await page.getByLabel("Password", { exact: true }).fill(f.owner.password);
  await page.getByRole("button", { name: "Log in", exact: true }).click(); await expect(page).toHaveURL(/\/devices\/link$/);
  await expect(page.getByRole("heading", { name: "Link your SmartClamp", exact: true })).toBeVisible();
  await page.evaluate(() => {
    const token = localStorage.getItem("smartclamp_token")!.split("."); const payload = JSON.parse(atob(token[1].replace(/-/g, "+").replace(/_/g, "/"))); payload.exp = 1;
    token[1] = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_"); localStorage.setItem("smartclamp_token", token.join("."));
  });
  const stale = await page.evaluate(() => localStorage.getItem("smartclamp_token"));
  let refreshes = 0; page.on("request", r => { if (r.url().endsWith("/auth/refresh")) refreshes++; });
  await page.goto("/history"); await expect(page.getByRole("heading", { name: "Usage history", exact: true })).toBeVisible();
  expect(refreshes).toBe(1); expect(await page.evaluate(old => localStorage.getItem("smartclamp_token") !== old, stale)).toBeTruthy();
  expect(await page.evaluate(() => !!localStorage.getItem("smartclamp_refresh_token"))).toBeTruthy();
  await page.reload(); await expect(page.getByRole("heading", { name: "Usage history", exact: true })).toBeVisible(); expect(refreshes).toBe(1);
});

test("real auth/database: refresh transport failure retains the login and retries safely", async ({ page }) => {
  test.skip(!fixture, "Requires isolated real GoTrue/API/database services."); const f = JSON.parse(fs.readFileSync(fixture!, "utf8"));
  await page.goto("/login"); await page.getByLabel("Phone number").fill(f.owner.phone); await page.getByLabel("Password", { exact: true }).fill(f.owner.password);
  await page.getByRole("button", { name: "Log in", exact: true }).click(); await expect(page).toHaveURL(/dashboard/);
  await page.evaluate(() => localStorage.removeItem("smartclamp_token"));
  await page.route("**/api/v1/auth/refresh", r => r.abort()); await page.goto("/history");
  await expect(page.getByRole("heading", { name: "We couldn’t verify your workspace.", exact: true })).toBeVisible();
  expect(await page.evaluate(() => !!localStorage.getItem("smartclamp_refresh_token"))).toBeTruthy();
  await page.unroute("**/api/v1/auth/refresh"); await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Usage history", exact: true })).toBeVisible();
});
