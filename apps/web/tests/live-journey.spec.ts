import { test, expect } from "@playwright/test";
import fs from "node:fs";
const file = process.env.SMARTCLAMP_BROWSER_FIXTURE;
test("real auth/database: landlord creates room, links device, invites resident and quotes electricity", async ({
  page,
}) => {
  test.skip(
    !file,
    "Requires isolated real API, PostgreSQL and auth services; not a mocked browser test.",
  );
  const fixture = JSON.parse(fs.readFileSync(file!, "utf8"));
  async function login(user: any) {
    await page.goto("/login");
    await page.getByLabel("Phone number").fill(user.phone);
    await page.getByLabel("Password", { exact: true }).fill(user.password);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page).toHaveURL(/dashboard/);
  }
  await login(fixture.owner);
  await page.goto("/dashboard/landlord/buildings/new");
  await page.getByLabel("Building name").fill(`Browser journey ${Date.now()}`);
  await page.getByLabel("Address", { exact: true }).fill("Isolated QA address");
  await page.getByRole("button", { name: "Continue to rooms" }).click();
  await expect(page).toHaveURL(/\/rooms$/);
  await page.getByLabel("Room name").fill("Cedar room");
  await page.getByRole("button", { name: "Add room", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Cedar room" })).toBeVisible();
  await page
    .getByRole("link", { name: "Link SmartClamp", exact: true })
    .click();
  await page.getByLabel("Device claim code").fill(fixture.claim_code);
  await page
    .getByRole("button", { name: "Link SmartClamp", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "SmartClamp linked" }),
  ).toBeVisible();
  await page.goBack();
  await page
    .getByRole("button", { name: "Create resident invitation" })
    .click();
  const invitation = await page
    .locator('a[href^="/join?token="]')
    .getAttribute("href");
  expect(invitation).toBeTruthy();
  await page.evaluate(() => localStorage.clear());
  await page.goto(invitation!);
  await page.getByRole("link", { name: "Log in", exact: true }).last().click();
  await page.getByLabel("Phone number").fill(fixture.tenant.phone);
  await page
    .getByLabel("Password", { exact: true })
    .fill(fixture.tenant.password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/join\?token=/);
  await page.getByRole("button", { name: "Join my room" }).click();
  await expect(
    page.getByText("You have joined your room.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Open my dashboard" }).click();
  await expect(page).toHaveURL(/dashboard\/tenant/);
  await page.goto("/history");
  await expect(
    page.getByText(
      "No records yet. New records will appear here once received.",
    ),
  ).toBeVisible();
  await page.goto("/billing");
  await page.getByLabel("Amount in naira").fill("500");
  await page.getByLabel("Receipt email").fill("browser@example.test");
  await page.getByRole("button", { name: "Get itemized quote" }).click();
  await expect(page.getByRole("heading", { name: "Your quote" })).toBeVisible();
  await expect(page.getByText("5.000 kWh estimated", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue to secure checkout" }),
  ).toBeVisible();
  // A quote is not a payment: the interface must not show a credited receipt.
  await expect(
    page.getByText("Payment confirmed, vending completed", { exact: false }),
  ).toHaveCount(0);
});
