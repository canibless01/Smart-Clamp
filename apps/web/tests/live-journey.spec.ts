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
  await expect(page.getByText("Waiting for measured readings",{exact:true}).first()).toBeVisible();
  await page.getByText("Measurement records",{exact:true}).click();
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

test('real auth/database: building comparison keeps unconfigured incoming energy unknown on mobile',async({page})=>{
 test.skip(!file,'Requires isolated real API/Auth/database services.');const f=JSON.parse(fs.readFileSync(file!,'utf8'));
 await page.goto('/login');await page.getByLabel('Phone number').fill(f.owner.phone);await page.getByLabel('Password',{exact:true}).fill(f.owner.password);await page.getByRole('button',{name:'Log in',exact:true}).click();await expect(page).toHaveURL(/dashboard/);
 await page.goto('/dashboard/landlord/buildings/new');await page.getByLabel('Building name').fill('QA reconciliation '+Date.now());await page.getByLabel('Address',{exact:true}).fill('Isolated QA address');await page.getByRole('button',{name:'Continue to rooms'}).click();await expect(page).toHaveURL(/\/rooms$/);
 const panel=page.locator('section').filter({has:page.getByRole('heading',{name:'Incoming energy & rooms',exact:true})});await expect(panel.getByRole('status')).toHaveText('Comparison unknown');await expect(panel.getByText('An authorised administrator must approve timing and tolerance settings before comparison.')).toBeVisible();await expect(panel.locator('dd').filter({hasText:'—'})).toHaveCount(3);
 await page.getByRole('combobox',{name:'Comparison period'}).selectOption('60');await expect(panel.getByRole('status')).toHaveText('Comparison unknown');await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});

test('real auth/database: landlord records an auditable comparison group without certifying wiring',async({page})=>{
 test.skip(!file,'Requires isolated real API/Auth/database services.');const f=JSON.parse(fs.readFileSync(file!,'utf8'));test.skip(!f.topology_owner,'Requires current topology fixture.');
 await page.goto('/login');await page.getByLabel('Phone number').fill(f.topology_owner.phone);await page.getByLabel('Password',{exact:true}).fill(f.topology_owner.password);await page.getByRole('button',{name:'Log in',exact:true}).click();await expect(page).toHaveURL(/dashboard/);await page.goto(`/dashboard/landlord/buildings/${f.topology_building_id}/rooms`);
 await page.getByText('Record incoming & branch devices',{exact:true}).click();const previous=Number((await page.locator('legend').filter({hasText:'Recorded topology · version'}).textContent())?.match(/version (\d+)/)?.[1]);await page.getByRole('combobox',{name:'Incoming source',exact:true}).selectOption(f.topology_incoming_id);await page.getByRole('checkbox',{name:/Unassigned\/common circuit/}).check();await page.getByLabel('Wiring record and reason').fill('Isolated QA comparison group; physical installation is not certified.');await page.getByRole('button',{name:'Save comparison group',exact:true}).click();await expect(page.getByText('Comparison group recorded. Physical wiring still requires installation verification.',{exact:true})).toBeVisible();await expect(page.getByText('Recorded topology · version '+(previous+1),{exact:true})).toBeVisible();
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});

test('real auth/database: closed energy window keeps unknown coverage and exports exact QA evidence',async({page})=>{
 test.skip(!file,'Requires isolated real API/Auth/database services.');const f=JSON.parse(fs.readFileSync(file!,'utf8'));test.skip(!f.topology_owner,'Requires current history fixture.');
 await page.goto('/login');await page.getByLabel('Phone number').fill(f.topology_owner.phone);await page.getByLabel('Password',{exact:true}).fill(f.topology_owner.password);await page.getByRole('button',{name:'Log in',exact:true}).click();await expect(page).toHaveURL(/dashboard/);await page.goto(`/dashboard/landlord/buildings/${f.topology_building_id}/rooms`);await page.getByText('Recorded windows & unaccounted energy',{exact:true}).click();await page.getByRole('button',{name:'Record latest closed window',exact:true}).click();await expect(page.getByText('Latest window has unknown coverage',{exact:false})).toBeVisible();await expect(page.getByText('Unknown coverage · difference —',{exact:true}).first()).toBeVisible();await page.getByText('Recorded evidence',{exact:true}).first().click();
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Download window evidence',exact:true}).first().click();const result=await downloaded;const exported=JSON.parse(fs.readFileSync((await result.path())!,'utf8'));const {createHash}=await import('node:crypto');const canonical=Buffer.from(exported.canonical_base64,'base64');expect(createHash('sha256').update(canonical).digest('hex')).toBe(exported.sha256);expect(JSON.parse(canonical.toString()).environment).toBe('isolated_qa');expect(exported.signature).toBeNull();
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
