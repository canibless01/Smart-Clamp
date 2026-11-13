import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const fixture=process.env.SMARTCLAMP_BROWSER_FIXTURE;
test('real auth/database: staff previews a notice, commits it and recipient sees the saved message',async({page})=>{
  test.skip(!fixture,'Requires isolated API/Auth/PostgreSQL');const f=JSON.parse(fs.readFileSync(fixture!,'utf8'));
  async function login(user:any){await page.goto('/login');await page.evaluate(()=>localStorage.clear());await page.getByLabel('Phone number').fill(user.phone);await page.getByLabel('Password',{exact:true}).fill(user.password);await page.getByRole('button',{name:'Log in',exact:true}).click();await expect(page).toHaveURL(/\/(dashboard|ops)/);}
  await login(f.ops);await page.goto('/communications');
  await page.getByLabel(new RegExp(f.message_device_id)).check();await page.getByLabel('Notice title',{exact:true}).fill('Browser QA service update');await page.getByLabel('Service message',{exact:true}).fill('Your recorded connection is being reviewed by the service team.');
  await page.getByRole('button',{name:'Preview current audience',exact:true}).click();await expect(page.getByRole('heading',{name:'Review before sending',exact:true})).toBeVisible();
  await expect(page.getByText('1 in-app recipients · 0 browser subscriptions · 0 SMS recipients',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Commit notice to this audience',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'1 in-app notices committed.'})).toBeVisible();
  await login(f.message_recipient);await page.goto('/alerts');await expect(page.getByText('Browser QA service update',{exact:false})).toBeVisible();
});
test('real auth/database: opted-in customer receives a scoped utility service notice',async({page})=>{
  test.skip(!fixture,'Requires isolated API/Auth/PostgreSQL');const f=JSON.parse(fs.readFileSync(fixture!,'utf8'));
  async function login(user:any){await page.goto('/login');await page.evaluate(()=>localStorage.clear());await page.getByLabel('Phone number').fill(user.phone);await page.getByLabel('Password',{exact:true}).fill(user.password);await page.getByRole('button',{name:'Log in',exact:true}).click();await expect(page).toHaveURL(/\/(dashboard|ops)/);}
  await login(f.message_recipient);await page.goto('/settings');await page.getByRole('checkbox',{name:'Allow service notices from the reviewed utility organization assigned to my device'}).check();await page.getByRole('button',{name:'Save preferences',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Preferences saved.'})).toBeVisible();
  await login(f.utility);await page.goto('/communications');await page.getByLabel('Reviewed utility organization').selectOption(f.utility_organization_id);
  await page.getByLabel(new RegExp(f.message_device_id)).check();await page.getByLabel('Notice title',{exact:true}).fill('Browser QA utility update');await page.getByLabel('Service message',{exact:true}).fill('A connection service review is scheduled for your assigned device.');
  await page.getByRole('button',{name:'Preview current audience',exact:true}).click();await expect(page.getByText('1 in-app recipients · 0 browser subscriptions · 0 SMS recipients',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Commit notice to this audience',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'1 in-app notices committed.'})).toBeVisible();
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await login(f.message_recipient);await page.goto('/alerts');await expect(page.getByText('Browser QA utility update',{exact:false})).toBeVisible();
});
