import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const fixture=process.env.SMARTCLAMP_BROWSER_FIXTURE;
test('real support request: customer submits, staff claims and resolves, customer reopens',async({page})=>{
  test.skip(!fixture,'Requires isolated API/Auth/PostgreSQL');const f=JSON.parse(fs.readFileSync(fixture!,'utf8'));const subject='Browser support workflow '+Date.now();
  async function login(user:any){await page.goto('/login');await page.evaluate(()=>localStorage.clear());await page.getByLabel('Phone number').fill(user.phone);await page.getByLabel('Password',{exact:true}).fill(user.password);await page.getByRole('button',{name:'Log in',exact:true}).click();await expect(page).toHaveURL(/\/(dashboard|ops)/);}
  await login(f.owner);await page.goto('/support');await page.getByLabel('A short summary',{exact:true}).fill(subject);await page.getByLabel('Tell us a little more',{exact:true}).fill('Please review this connection issue.');await page.getByRole('button',{name:/send.*request/i}).click();await page.getByRole('link',{name:'View request',exact:true}).click();await expect(page).toHaveURL(/\/support\/tickets\//);const ticketUrl=page.url();
  await login(f.admin);await page.goto('/support/requests');await page.getByRole('link',{name:subject,exact:true}).click();
  await page.getByLabel('Update for the customer').fill('Support has claimed this case.');await page.getByRole('button',{name:'Save request update'}).click();await expect(page.getByText('Status: triaged',{exact:true})).toBeVisible();
  await page.getByRole('combobox',{name:'Action',exact:true}).selectOption('resolve');await page.getByLabel('Update for the customer').fill('Connection review is complete.');await page.getByRole('button',{name:'Save request update'}).click();await expect(page.getByText('Status: resolved',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Send reply'})).toHaveCount(0);
  await login(f.owner);await page.goto(ticketUrl);await page.getByLabel('Reason for reopening').fill('The same issue has returned.');await page.getByRole('button',{name:'Save request update'}).click();await expect(page.getByText('Status: reopened',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Send reply'})).toBeVisible();
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
