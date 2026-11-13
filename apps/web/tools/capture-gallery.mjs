// Run only against tools/dashboard_gallery.py and its private /tmp fixture.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const fixture = process.env.SMARTCLAMP_GALLERY_FIXTURE;
if (!fixture || !path.resolve(fixture).startsWith('/tmp/')) throw new Error('An isolated /tmp gallery fixture is required');
const f=JSON.parse(fs.readFileSync(fixture,'utf8'));
const origin=process.env.UI_BASE_URL || 'http://127.0.0.1:3100';
if (!['localhost','127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Local QA only');
const out=path.resolve('../../docs/screenshots');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const views=[['homeowner','/dashboard/homeowner','homeowner-overview'],['homeowner','/control','homeowner-control'],['homeowner','/billing','homeowner-wallet'],['homeowner','/history','homeowner-history'],['landlord','/dashboard/landlord','landlord-overview'],['landlord',`/dashboard/landlord/buildings/${f.building_id}/rooms`,'landlord-rooms'],['tenant','/dashboard/tenant','resident-overview'],['ops','/ops','operations-overview'],['engineer','/ops/firmware','engineering-firmware'],['installer','/portal','installer-assignments'],['installer',`/portal/jobs/${f.job_id}`,'installer-work-order'],['utility','/dashboard/utility','utility-overview']];
try {
  for (const [role,url,name] of views) {
    const context=await browser.newContext({viewport:{width:1440,height:1080},timezoneId:'Africa/Lagos'});
    const page=await context.newPage();const user=f.users[role];
    await page.goto(origin+'/login');await page.getByLabel('Phone number').fill(user.phone);
    await page.getByLabel('Password',{exact:true}).fill(user.password);await page.getByRole('button',{name:'Log in',exact:true}).click();
    await page.waitForURL(/\/(dashboard|ops|portal)/);
    await page.goto(origin+url);await page.waitForLoadState('networkidle');
    if (new URL(page.url()).pathname!==url) throw new Error('Unexpected route for '+name);
    if ((await page.locator('[role="alert"]').allTextContents()).some(text=>text.trim())) throw new Error('Dashboard error for '+name);
    async function label() {
      await page.evaluate(() => {
        const note=document.createElement('div');note.id='qa-capture-note';note.textContent='ISOLATED QA • Signed simulated readings / local payment fixtures • No live hardware or merchant';
        Object.assign(note.style,{position:'fixed',bottom:'0',left:'0',right:'0',padding:'10px',background:'#112e26',color:'#fff',font:'12px sans-serif',textAlign:'center',zIndex:'99999'});document.body.append(note);
      });
    }
    await label();await page.screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:85,fullPage:true});
    if (name==='homeowner-overview' || name==='homeowner-wallet') {
      await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,name+'-mobile.jpg'),type:'jpeg',quality:85,fullPage:true});
    }
    console.log('Captured '+name);await context.close();
  }
} finally { await browser.close(); }
