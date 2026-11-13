import { test,expect } from '@playwright/test';
import fs from 'node:fs';
const fixture=process.env.SMARTCLAMP_BROWSER_FIXTURE;
test('real auth/database: email signup requires explicit consent and retains its session',async({page})=>{
  test.skip(!fixture,'Requires isolated real GoTrue/API/database services');
  const f=JSON.parse(fs.readFileSync(fixture!,'utf8'));test.skip(!f.pending_email,'Requires email-enabled isolated GoTrue');
  const email=`browser-${Date.now()}@example.test`,password='Browser-email-password-42';
  await page.goto('/signup');await page.getByLabel('Full name').fill('Browser email QA');
  await page.getByLabel('Phone number or email').fill(email);await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Create my account',exact:true}).click();
  await expect(page.getByText('Read and accept the terms and privacy policy before creating your account.')).toBeVisible();
  await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Create my account',exact:true}).click();
  await expect(page).toHaveURL(/dashboard\/homeowner/);await page.goto('/settings');
  await expect(page.getByText(email,{exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Add a verified phone',exact:true})).toBeVisible();
  await page.reload();await expect(page.getByText(email,{exact:true})).toBeVisible();
});
test('real auth/database: new verified identity completes profile before private workspace access',async({page})=>{
  test.skip(!fixture,'Requires isolated real GoTrue/API/database services');
  const f=JSON.parse(fs.readFileSync(fixture!,'utf8'));test.skip(!f.pending_email,'Requires email-enabled isolated GoTrue');
  await page.goto('/login?next=%2Fhistory');await page.getByLabel('Phone number or email').fill(f.pending_email.email);
  await page.getByLabel('Password',{exact:true}).fill(f.pending_email.password);await page.getByRole('button',{name:'Log in',exact:true}).click();
  await expect(page).toHaveURL(/account\/complete-profile/);
  await expect(page.getByRole('complementary',{name:'Workspace navigation'})).toHaveCount(0);
  await page.goto('/billing');await expect(page).toHaveURL(/account\/complete-profile/);
  await page.getByLabel('Full name').fill('Completed identity QA');await page.getByLabel('Your setup').selectOption('tenant');
  await expect(page.getByRole('button',{name:'Complete my profile',exact:true})).toBeDisabled();
  await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Complete my profile',exact:true}).click();
  await expect(page).toHaveURL(/\/billing$/);await expect(page.getByRole('heading',{name:'Wallet & electricity payments',exact:true})).toBeVisible();
});
test('Google callback refuses a code without the initiating browser PKCE request',async({page})=>{
  await page.goto('/auth/callback?code=untrusted&flow_id=untrusted');
  await expect(page.getByRole('alert').filter({hasText:'This sign-in request has expired.'})).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/callback$/);
});
