import { test, expect } from "@playwright/test";
import fs from "node:fs";
import {createHash,verify} from "node:crypto";
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

test("real auth/database: resident issues a fixed report, downloads CSV and revokes its public link", async ({ page, context }) => {
  test.skip(!file, "Requires isolated real auth/API/database services.");
  const f = JSON.parse(fs.readFileSync(file!, "utf8"));
  await page.goto("/login"); await page.getByLabel("Phone number").fill(f.message_recipient.phone); await page.getByLabel("Password", { exact: true }).fill(f.message_recipient.password);
  await page.getByRole("button", { name: "Log in", exact: true }).click(); await expect(page).toHaveURL(/dashboard/);
  await page.goto("/reports");
  const end = new Date(), start = new Date(end.getTime() - 2 * 86400000);
  await page.getByLabel("Period start", { exact: true }).fill(start.toISOString().slice(0, 10));
  await page.getByLabel("Period end (exclusive)", { exact: true }).fill(end.toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Issue signed snapshot", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Issued measurement snapshot", exact: true })).toBeVisible();
  await expect(page.getByText("Stored snapshot signature verified.", { exact: false })).toBeVisible();
  const share = await page.getByRole("link", { name: "Open sharing link", exact: true }).getAttribute("href");
  await page.getByRole('button',{name:'Show sharing QR',exact:true}).click();await expect(page.getByRole('img',{name:'Report sharing QR code',exact:true})).toBeVisible();
  await page.addScriptTag({content:fs.readFileSync('node_modules/jsqr/dist/jsQR.js','utf8')});
  const decoded=await page.evaluate(async()=>{const svg=document.querySelector('[data-report-qr] svg') as SVGSVGElement;const image=new Image();const loaded=new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('QR rasterization failed'));});image.src='data:image/svg+xml;base64,'+btoa(new XMLSerializer().serializeToString(svg));await loaded;const canvas=document.createElement('canvas');canvas.width=canvas.height=svg.viewBox.baseVal.width*3;const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0,canvas.width,canvas.height);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);return (window as any).jsQR(pixels.data,canvas.width,canvas.height)?.data;});
  expect(decoded).toBe(new URL(share!,page.url()).href);
  const evidenceDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Download signed evidence',exact:true}).click();const evidenceFile=await evidenceDownload;const evidence=JSON.parse(fs.readFileSync((await evidenceFile.path())!,'utf8')),canonical=Buffer.from(evidence.canonical_base64,'base64');expect(createHash('sha256').update(canonical).digest('hex')).toBe(evidence.sha256);expect(verify('RSA-SHA256',canonical,evidence.public_key_pem,Buffer.from(evidence.signature,'base64'))).toBeTruthy();expect(JSON.parse(canonical.toString()).environment).toBe('isolated_qa');expect(evidence.snapshot).toEqual(JSON.parse(canonical.toString()));
  await page.emulateMedia({media:'print'});await expect(page.getByRole('heading',{name:'Choose a completed period',exact:true})).not.toBeVisible();await expect(page.getByRole('heading',{name:'Issued measurement snapshot',exact:true})).toBeVisible();await expect(page.getByText('Isolated QA · no production hardware evidence.',{exact:true})).toBeVisible();await expect(page.locator('.report-print-proof')).toBeVisible();const pdf=await page.pdf({format:'A4'});expect(pdf.subarray(0,4).toString()).toBe('%PDF');await page.emulateMedia({media:'screen'});
  const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Download snapshot CSV", exact: true }).click();
  const received = await download; const csv = fs.readFileSync((await received.path())!, "utf8"); expect(csv).toContain("occurred_at_ms,quality,clock_quality");
  const publicPage = await context.newPage(); await publicPage.goto(share!); await expect(publicPage.getByText("Stored snapshot signature verified.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Revoke sharing link", exact: true }).click();
  await expect(page.getByText("Public sharing revoked.", { exact: false })).toBeVisible();
  await expect(page.getByRole('img',{name:'Report sharing QR code',exact:true})).toHaveCount(0);
  await publicPage.reload(); await expect(publicPage.getByRole("alert").filter({ hasText: "Report not found or no longer shared" })).toBeVisible();
  await publicPage.close();
});

test('real auth/database: administrator publishes scoped settings and operations stays read-only',async({page})=>{
 test.skip(!file,'Requires isolated real auth/API/database services.');const f=JSON.parse(fs.readFileSync(file!,'utf8'));
 async function login(user:any){await page.goto('/login');await page.evaluate(()=>localStorage.clear());await page.getByLabel('Phone number').fill(user.phone);await page.getByLabel('Password',{exact:true}).fill(user.password);await page.getByRole('button',{name:'Log in',exact:true}).click();await expect(page).toHaveURL(/\/ops$/);await page.goto('/ops/settings');}
 await login(f.admin);await page.getByRole('combobox',{name:'Setting',exact:true}).selectOption('reports.link_lifetime_days');await page.getByRole('combobox',{name:'Scope',exact:true}).selectOption('device');await page.getByLabel('Scope reference').fill(f.message_device_id);await page.getByRole('button',{name:'Load selected scope'}).click();await page.getByLabel('Whole value',{exact:true}).fill('8');await page.getByLabel('Reason for this reviewed change').fill('Isolated QA report expiry review');await page.getByRole('button',{name:'Publish reviewed setting'}).click();await expect(page.getByRole('status').filter({hasText:'A new audited version'})).toBeVisible();
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await login(f.ops);await page.getByRole('button',{name:'Load selected scope'}).click();await expect(page.getByRole('button',{name:'Publish reviewed setting'})).toBeDisabled();
});

test('real auth/database: resident reviews consent history and withdraws optional delivery',async({page})=>{
 test.skip(!file,'Requires isolated real auth/API/database services.');const f=JSON.parse(fs.readFileSync(file!,'utf8'));
 await page.goto('/login');await page.getByLabel('Phone number').fill(f.message_recipient.phone);await page.getByLabel('Password',{exact:true}).fill(f.message_recipient.password);await page.getByRole('button',{name:'Log in',exact:true}).click();await expect(page).toHaveURL(/\/dashboard(?:\/homeowner)?$/);await page.goto('/settings');
 const utility=page.getByRole('checkbox',{name:'Allow service notices from the reviewed utility organization assigned to my device'});await utility.check();await page.getByRole('button',{name:'Save preferences',exact:true}).click();await expect(page.getByText('Preferences saved.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Withdraw optional communication permissions',exact:true}).click();await expect(utility).not.toBeChecked();await page.getByText('Communication preference history',{exact:true}).click();await expect(page.getByText(/Notices from the reviewed utility organisation assigned to your device: Allowed → Not allowed/).first()).toBeVisible();
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
