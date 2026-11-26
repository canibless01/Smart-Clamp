import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const fixture=process.env.SMARTCLAMP_BROWSER_FIXTURE;
test('real auth/database: staff previews a notice, commits it and recipient sees the saved message',async({page})=>{
  test.skip(!fixture,'Requires isolated API/Auth/PostgreSQL');const f=JSON.parse(fs.readFileSync(fixture!,'utf8'));
  async function login(user:any){await page.goto('/login');await page.evaluate(()=>localStorage.clear());await page.getByLabel('Phone number').fill(user.phone);await page.getByLabel('Password',{exact:true}).fill(user.password);await page.getByRole('button',{name:'Log in',exact:true}).click();await expect(page).toHaveURL(/\/(dashboard|ops)/);}
  await login(f.ops);await page.goto('/communications');await page.getByRole('combobox',{name:'Audience selection',exact:true}).selectOption('devices');
  await page.getByLabel('Find a device',{exact:true}).fill(f.message_device_id);await page.getByLabel(new RegExp(f.message_device_id)).check();await page.getByLabel('Notice title',{exact:true}).fill('Browser QA service update');await page.getByLabel('Service message',{exact:true}).fill('Your recorded connection is being reviewed by the service team.');
  await page.getByRole('button',{name:'Preview current audience',exact:true}).click();await expect(page.getByRole('heading',{name:'Review before sending',exact:true})).toBeVisible();
  await expect(page.getByText('1 in-app recipients · 0 browser subscriptions · 0 SMS recipients',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Commit notice to this audience',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'1 in-app notices committed.'})).toBeVisible();
  await login(f.message_recipient);await page.goto('/alerts');await expect(page.getByText('Browser QA service update',{exact:false})).toBeVisible();
});
test('real auth/database: opted-in customer receives a scoped utility service notice',async({page})=>{
  test.skip(!fixture,'Requires isolated API/Auth/PostgreSQL');const f=JSON.parse(fs.readFileSync(fixture!,'utf8'));
  async function login(user:any){await page.goto('/login');await page.evaluate(()=>localStorage.clear());await page.getByLabel('Phone number').fill(user.phone);await page.getByLabel('Password',{exact:true}).fill(user.password);await page.getByRole('button',{name:'Log in',exact:true}).click();await expect(page).toHaveURL(/\/(dashboard|ops)/);}
  await login(f.message_recipient);await page.goto('/settings');await page.getByRole('checkbox',{name:'Allow service notices from the reviewed utility organization assigned to my device'}).check();await page.getByRole('button',{name:'Save preferences',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Preferences saved.'})).toBeVisible();
  await login(f.utility);await page.goto('/communications');await page.getByRole('combobox',{name:'Audience selection',exact:true}).selectOption('devices');await page.getByLabel('Reviewed utility organization').selectOption(f.utility_organization_id);
  await page.getByLabel('Find a device',{exact:true}).fill(f.message_device_id);await page.getByLabel(new RegExp(f.message_device_id)).check();await page.getByLabel('Notice title',{exact:true}).fill('Browser QA utility update');await page.getByLabel('Service message',{exact:true}).fill('A connection service review is scheduled for your assigned device.');
  await page.getByRole('button',{name:'Preview current audience',exact:true}).click();await expect(page.getByText('1 in-app recipients · 0 browser subscriptions · 0 SMS recipients',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Commit notice to this audience',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'1 in-app notices committed.'})).toBeVisible();
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await login(f.message_recipient);await page.goto('/alerts');await expect(page.getByText('Browser QA utility update',{exact:false})).toBeVisible();
});

test('real auth/database: verified email opt-in appears in staff audience and queues a saved email',async({page})=>{
  test.skip(!fixture,'Requires isolated API/Auth/PostgreSQL');const f=JSON.parse(fs.readFileSync(fixture!,'utf8')),noticeTitle='Verified email browser notice '+Date.now();test.skip(!f.email_recipient,'Requires isolated email-enabled QA');
  async function login(user:any){await page.goto('/login');await page.evaluate(()=>localStorage.clear());await page.getByLabel('Phone number').fill(user.phone||user.email);await page.getByLabel('Password',{exact:true}).fill(user.password);await page.getByRole('button',{name:'Log in',exact:true}).click();await expect(page).toHaveURL(/\/(dashboard|ops)/);}
  await login(f.email_recipient);await page.goto('/settings');await page.getByRole('checkbox',{name:'Send account events to my verified email',exact:true}).check();await page.getByRole('button',{name:'Save preferences',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Preferences saved.'})).toBeVisible();
  await login(f.admin);await page.goto('/communications');await page.getByRole('combobox',{name:'Audience selection',exact:true}).selectOption('devices');await page.getByLabel('Find a device',{exact:true}).fill(f.email_device_id);await page.getByLabel(new RegExp(f.email_device_id)).check();await page.getByLabel('Notice title',{exact:true}).fill(noticeTitle);await page.getByLabel('Service message',{exact:true}).fill('Review this saved account notice securely in SmartClamp.');await page.getByRole('checkbox',{name:/Include email for opted-in verified accounts/}).check();
  await page.getByRole('button',{name:'Preview current audience',exact:true}).click();await expect(page.getByText('1 in-app recipients · 0 browser subscriptions · 0 SMS recipients · 1 email recipients',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Commit notice to this audience',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'1 in-app notices committed.'})).toBeVisible();
  await login(f.email_recipient);await page.goto('/alerts');await page.getByRole('button',{name:'History',exact:true}).click();const records=page.getByRole('article').filter({hasText:noticeTitle});await expect(records).toHaveCount(2);await expect(records.getByText('email · queued',{exact:true})).toBeVisible();
});

test('real auth/database: region category selects accounts automatically without device checkboxes',async({page})=>{
  test.skip(!fixture,'Requires isolated API/Auth/PostgreSQL');const f=JSON.parse(fs.readFileSync(fixture!,'utf8'));
  await page.goto('/login');await page.getByLabel('Phone number').fill(f.cohort_ops.phone);await page.getByLabel('Password',{exact:true}).fill(f.cohort_ops.password);await page.getByRole('button',{name:'Log in',exact:true}).click();await expect(page).toHaveURL(/\/ops$/);await page.goto('/communications');
  await expect(page.getByRole('combobox',{name:'Audience selection',exact:true})).toHaveValue('automatic');await expect(page.getByRole('group',{name:'Devices in the audience'})).toHaveCount(0);
  await page.getByRole('combobox',{name:'Region',exact:true}).selectOption(f.service_region);await page.getByRole('combobox',{name:'Account type',exact:true}).selectOption('homeowner');await page.getByLabel('Notice title',{exact:true}).fill('Automatic region notice');await page.getByLabel('Service message',{exact:true}).fill('This reviewed region audience is selected automatically.');
  await page.getByRole('button',{name:'Preview current audience',exact:true}).click();await expect(page.getByText('1 in-app recipients · 0 browser subscriptions · 0 SMS recipients',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Commit notice to this audience',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'1 account notices queued.'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Reuse categories',exact:true})).toBeVisible();await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
