import { test, expect } from "@playwright/test";
import fs from "node:fs";
const file = process.env.SMARTCLAMP_BROWSER_FIXTURE;
test("real auth/database: operations assigns work and installer submits diagnostics for review", async ({ page }) => {
  test.skip(!file, "Requires isolated real auth/API/database services.");
  const f = JSON.parse(fs.readFileSync(file!, "utf8"));
  async function login(user: any) {
    await page.goto("/login"); await page.evaluate(() => localStorage.clear());
    await page.getByLabel("Phone number").fill(user.phone); await page.getByLabel("Password", { exact: true }).fill(user.password);
    await page.getByRole("button", { name: "Log in", exact: true }).click(); await expect(page).toHaveURL(/\/(ops|portal)$/);
    await page.goto(`/portal/jobs/${f.job_id}`);
  }
  async function notes(text: string) { await page.getByLabel("Work and diagnostic notes").fill(text); }
  await login(f.ops);
  await page.getByLabel("Installer account ID").fill(f.installer.id); await notes("Inspect recorded sensor and connection diagnostics.");
  await page.getByRole("button", { name: "Assign installer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "assigned", exact: true })).toBeVisible();
  await login(f.installer); await notes("Starting the assigned isolated QA work order.");
  await page.getByRole("button", { name: "Start work", exact: true }).click();
  await expect(page.getByRole("heading", { name: "in progress", exact: true })).toBeVisible();
  await page.getByLabel("Action", { exact: true }).selectOption("submit"); await notes("Diagnostics recorded. Hardware acceptance is still separate.");
  await page.getByRole("button", { name: "Submit for review", exact: true }).click();
  await expect(page.getByRole("heading", { name: "awaiting online", exact: true })).toBeVisible();
  await login(f.ops); await page.getByLabel("Action", { exact: true }).selectOption("close"); await notes("Reviewed the field notes. Closing this field-work record only.");
  await page.getByRole("button", { name: "Close field work", exact: true }).click();
  await expect(page.getByRole("heading", { name: "closed", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test("real auth/database: engineering uploads the built ESP32 binary and queues a canary", async ({ page }) => {
  test.skip(!file, "Requires isolated real auth/API/database services.");
  const f = JSON.parse(fs.readFileSync(file!, "utf8"));
  test.skip(!fs.existsSync(f.firmware_bin), "Requires the actual house_full PlatformIO build.");
  await page.goto("/login"); await page.getByLabel("Phone number").fill(f.engineer.phone); await page.getByLabel("Password", { exact: true }).fill(f.engineer.password);
  await page.getByRole("button", { name: "Log in", exact: true }).click(); await expect(page).toHaveURL(/\/ops$/);
  await page.getByRole("link", { name: "Firmware updates", exact: true }).click();
  await page.getByLabel("Firmware version", { exact: true }).fill(`browser-${Date.now()}`);
  await page.getByLabel("Secure version", { exact: true }).fill(String(Math.floor(Date.now()/1000)));
  await page.getByLabel("Application .bin", { exact: true }).setInputFiles(f.firmware_bin);
  await page.getByRole("button", { name: "Sign and store binary", exact: true }).click();
  await expect(page.getByText("Signed artifact stored.", { exact: false })).toBeVisible();
  await page.getByLabel("Device IDs, canary first").fill(f.device_id);
  await page.getByRole("button", { name: "Start one-device canary", exact: true }).click();
  await expect(page.getByText("Canary queued for the first listed device.", { exact: false })).toBeVisible();
  const targetRow = page.getByRole("row").filter({ has: page.getByRole("cell", { name: f.device_id, exact: true }) });
  await expect(targetRow.getByRole("cell", { name: "pending", exact: true })).toBeVisible();
  // No physical device is connected: upload/download cannot be presented as a healthy boot.
  await expect(targetRow.getByRole("cell", { name: "boot_confirmed", exact: true })).toHaveCount(0);
});

test("real auth/database: owner issues a fixed report, downloads CSV and revokes its public link", async ({ page, context }) => {
  test.skip(!file, "Requires isolated real auth/API/database services.");
  const f = JSON.parse(fs.readFileSync(file!, "utf8"));
  await page.goto("/login"); await page.getByLabel("Phone number").fill(f.owner.phone); await page.getByLabel("Password", { exact: true }).fill(f.owner.password);
  await page.getByRole("button", { name: "Log in", exact: true }).click(); await expect(page).toHaveURL(/dashboard/);
  await page.goto("/reports");
  const end = new Date(), start = new Date(end.getTime() - 2 * 86400000);
  await page.getByLabel("Period start", { exact: true }).fill(start.toISOString().slice(0, 10));
  await page.getByLabel("Period end (exclusive)", { exact: true }).fill(end.toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Issue signed snapshot", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Issued measurement snapshot", exact: true })).toBeVisible();
  await expect(page.getByText("Stored snapshot signature verified.", { exact: false })).toBeVisible();
  const share = await page.getByRole("link", { name: "Open seven-day sharing link", exact: true }).getAttribute("href");
  const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Download snapshot CSV", exact: true }).click();
  const received = await download; const csv = fs.readFileSync((await received.path())!, "utf8"); expect(csv).toContain("occurred_at_ms,quality,clock_quality");
  const publicPage = await context.newPage(); await publicPage.goto(share!); await expect(publicPage.getByText("Stored snapshot signature verified.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Revoke sharing link", exact: true }).click();
  await expect(page.getByText("Public sharing revoked.", { exact: false })).toBeVisible();
  await publicPage.reload(); await expect(publicPage.getByRole("alert").filter({ hasText: "Report not found or no longer shared" })).toBeVisible();
  await publicPage.close();
});
