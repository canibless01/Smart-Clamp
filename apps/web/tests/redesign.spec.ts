import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("landing is responsive without page-wide overflow or hydration errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Make sense",
  );
  await expect(page.locator(".hero-home-image")).toBeVisible();
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `overflow at ${width}`,
    ).toBeTruthy();
  }
  expect(errors).toEqual([]);
});
test("energy calculator uses user inputs without device control requests", async ({
  page,
}) => {
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") posts.push(r.url());
  });
  await page.goto("/");
  await page.getByLabel("Appliance power (watts)").fill("1000");
  await page.getByLabel("Hours used per day").fill("2");
  await expect(page.locator(".experience-metrics strong")).toContainText(
    "2.00",
  );
  await expect(page.locator(".energy-estimate strong")).toContainText("14.00");
  expect(posts).toEqual([]);
});
test("audience tabs, FAQs and motion controls work", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Your building" }).click();
  await expect(page.getByRole("tabpanel")).toContainText("Fairer bills");
  await page.getByRole("tab", { name: "Your building" }).press("ArrowRight");
  await expect(page.getByRole("tabpanel")).toContainText(
    "Already have a meter",
  );
  await page
    .locator("summary")
    .filter({ hasText: "Do I need a smart meter?" })
    .click();
  await expect(page.locator("details[open]")).toContainText("No. SmartClamp");
  await page
    .getByRole("button", { name: "Pause decorative animation" })
    .click();
  expect(
    await page
      .locator(".scene-energy-path .flow-line")
      .evaluate((e) => getComputedStyle(e).animationPlayState),
  ).toBe("paused");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".scene-energy-path .flow-line")
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe("none");
});
test("mobile navigation opens, traps focus and closes with Escape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open navigation" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Navigation" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("link", { name: "Make sense of your power" }).focus();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Close navigation" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
test("meter lookup supports Enter and preserves leading zeros", async ({
  page,
}) => {
  let sent = "";
  await page.route("**/api/v1/meters/validate", async (route) => {
    sent = route.request().postDataJSON().meter_number;
    await route.fulfill({
      json: {
        valid: true,
        customer_name: "A*** O***",
        disco_name: "Test provider",
      },
    });
  });
  await page.goto("/");
  await page.getByLabel("Meter number", { exact: true }).fill("004217839011");
  await page.getByLabel("Meter number", { exact: true }).press("Enter");
  await expect(page.getByText("Account found", { exact: true })).toBeVisible();
  expect(sent).toBe("004217839011");
  await page.getByLabel("Meter number", { exact: true }).fill("abc");
  await page.getByRole("button", { name: "Check meter", exact: true }).click();
  await expect(page.locator(".meter-error[role=alert]")).toContainText("6–20");
});
test("login routes the actual returned role and dashboard has no invented fallbacks", async ({
  page,
}) => {
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({ json: { access_token: "test-session", role: "tenant" } }),
  );
  await page.route("**/api/v1/dashboard/tenant", (route) =>
    route.fulfill({ json: { devices: [], allowed_actions: [] } }),
  );
  await page.goto("/login");
  await page.getByLabel("Phone number").fill("+2348012345678");
  await page.getByLabel("Password", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard\/tenant/);
  await expect(page.getByText("Your energy story starts here.")).toBeVisible();
  await expect(
    page.getByText("Your confirmed balance will appear here."),
  ).toBeVisible();
  await expect(page.getByText("1240", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Ops", exact: true }),
  ).toHaveCount(0);
});
test("landlord setup query is honored and create-building route exists", async ({
  page,
}) => {
  await page.goto("/signup?setup=landlord");
  await expect(
    page.getByRole("button", { name: "My building", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.addInitScript(() =>
    localStorage.setItem("smartclamp_token", "test-session"),
  );
  await page.route("**/api/v1/buildings", async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      name: "Cedar House",
      address: "Test street, Akure",
      meter_type: "with_meter",
    });
    expect(route.request().headers()["idempotency-key"]).toBeTruthy();
    await route.fulfill({ json: { building_id: "test-building" } });
  });
  await page.route("**/api/v1/buildings/test-building/rooms", (route) =>
    route.fulfill({ json: { items: [] } }),
  );
  await page.goto("/dashboard/landlord/buildings/new");
  await page.getByLabel("Building name").fill("Cedar House");
  await page.getByLabel("Address", { exact: true }).fill("Test street, Akure");
  await page.getByRole("button", { name: "Continue to rooms" }).click();
  await expect(page).toHaveURL(/test-building\/rooms/);
});
test("primary landing passes automated WCAG AA checks", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});
for (const path of [
  "/login",
  "/signup",
  "/pricing",
  "/how-it-works",
  "/support",
]) {
  test(`redesigned ${path} passes automated WCAG AA checks`, async ({
    page,
  }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  });
}

test("secondary auth actions are distinct and product/plan exploration works", async ({
  page,
}) => {
  await page.goto("/login");
  const signup = page
    .getByRole("link", { name: "Get started", exact: true })
    .last();
  await expect(signup).toHaveClass(/auth-switch/);
  await signup.click();
  await expect(page).toHaveURL(/signup/);
  await page.goto("/#devices");
  await expect(
    page.getByRole("heading", { name: "Find your place in the picture." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next devices" }).click();
  await page.goto("/products/home");
  await expect(
    page.getByRole("heading", { name: "Home SmartClamp", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Compare plans", exact: true }).click();
  await expect(page).toHaveURL(/pricing#compare/);
  await expect(
    page.getByRole("cell", { name: "Planned", exact: true }).first(),
  ).toBeVisible();
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
});
