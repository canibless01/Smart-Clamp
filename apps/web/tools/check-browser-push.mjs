// Real browser subscription attempt; never a simulated delivery claim.
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const fixture=process.env.SMARTCLAMP_BROWSER_FIXTURE;
if(!fixture?.startsWith('/tmp/'))throw new Error('Requires the private isolated browser QA fixture');
const f=JSON.parse(fs.readFileSync(fixture,'utf8')),origin=process.env.UI_BASE_URL||'http://127.0.0.1:3100';
if(new URL(origin).hostname!=='127.0.0.1')throw new Error('Local QA only');
const browser=await chromium.launch();
try{
  const context=await browser.newContext({permissions:['notifications']});const page=await context.newPage();
  await page.goto(origin+'/login');await page.getByLabel('Phone number').fill(f.owner.phone);await page.getByLabel('Password',{exact:true}).fill(f.owner.password);await page.getByRole('button',{name:'Log in',exact:true}).click();await page.waitForURL(/dashboard/);
  await page.goto(origin+'/settings');await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.getByRole('button',{name:'Enable notifications on this device',exact:true}).click();
  try{
    await page.getByRole('button',{name:'Disable notifications on this device',exact:true}).waitFor({timeout:30000});
    console.log('Real browser subscription created; this alone does not prove push receipt.');
    await page.getByRole('button',{name:'Disable notifications on this device',exact:true}).click();
  }catch{
    const statuses=await page.getByRole('status').allTextContents();
    const known=statuses.find(text=>/Registration failed|push service|permission|Permission|AbortError|NotAllowedError|timed out/i.test(text));
    console.log('Real browser subscription unavailable: '+(known?.slice(0,180)||'browser push registration did not complete within 30 seconds'));
  }
}finally{await browser.close();}
