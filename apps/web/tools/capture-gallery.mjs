// Actual local production-build captures. Never use against a customer environment.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const fixture=process.env.SMARTCLAMP_GALLERY_FIXTURE;
if(!fixture || !path.resolve(fixture).startsWith('/tmp/'))throw new Error('An isolated /tmp gallery fixture is required');
const f=JSON.parse(fs.readFileSync(fixture,'utf8')),origin=process.env.UI_BASE_URL||'http://127.0.0.1:3100';
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw new Error('Local QA only');
const out=path.resolve('../../docs/screenshots');fs.mkdirSync(out,{recursive:true});
const views=[];
const add=(role,url,name,state='Implemented page',prepare=null)=>views.push({role,url,name,state,prepare});
for(const [url,name] of [['/','public-home'],['/about','public-about'],['/how-it-works','public-how-it-works'],['/smart-meter','public-smart-meter'],['/for-homeowners','public-for-homeowners'],['/for-landlords','public-for-landlords'],['/utilities','public-utilities'],['/pricing','public-pricing'],['/install','public-installation'],['/faqs','public-faqs'],['/connection-help','public-connection-help'],['/terms','public-terms'],['/privacy','public-privacy'],['/login','public-login'],['/signup','public-signup'],['/account/recovery','public-account-recovery'],['/join','public-room-invitation']])add('public',url,name,'Public page / form');
for(const slug of ['home','pole','pole-gateway','building-hub','meter-reader','transformer'])add('public','/products/'+slug,'product-'+slug,'Product information');
for(const slug of ['basic','basic-pro','pro'])add('public','/plans/'+slug,'plan-'+slug,'Plan information');
add('public','/auth/callback','public-oauth-expired','Expected expired sign-in');
add('public','/d/qa-unissued-scope','public-sharing-unavailable','Explicitly unavailable');
add('public',f.report_share_path,'public-signed-report','Signed QA measurement snapshot');
for(const [url,name,state] of [['/dashboard/homeowner','homeowner-overview','Signed simulated measurements and credited QA wallet'],['/control','homeowner-control','Control form; no physical relay confirmation'],['/billing','homeowner-wallet','Reconciled local-fixture purchases'],['/history','homeowner-history','Signed simulated readings'],['/alerts','homeowner-alerts','Persisted account and staff/utility notices'],['/settings','homeowner-settings','Real profile/preferences and installation options'],['/orders','homeowner-orders','Actual QA installation request'],['/disputes','homeowner-disputes','Persisted dispute from an explicit QA bill'],['/support','homeowner-support','Support form'],['/devices/link','homeowner-device-link','Private claim form'],['/meters/link','homeowner-meter-link','Meter-provider validation form'],['/settings/subscription','homeowner-subscription','Actual saved entitlement status; checkout gated'],['/settings/smart-devices','smart-devices-unavailable','Explicitly unavailable'],['/settings/utility-control','utility-control-unavailable','Explicitly unavailable'],['/ir-reader/setup','reader-setup-unavailable','Explicitly unavailable'],['/community','community-unavailable','Explicitly unavailable']])add('homeowner',url,name,state);
add('homeowner',`/devices/${f.home_device_id}`,'homeowner-device-detail','Qualified QA metadata; no physical hardware qualification claim');
add('homeowner',`/devices/${f.home_device_id}/commands`,'homeowner-command-history','Actual command history; no invented switching');
add('homeowner',`/support/tickets/${f.ticket_id}`,'homeowner-support-thread','Persisted ticket and messages');
add('homeowner',`/disputes/${f.dispute_id}/meeting`,'homeowner-dispute-evidence','Stored explicit QA bill evidence');
add('homeowner','/reports','homeowner-signed-report','Stored signed QA snapshot',async page=>{await page.getByRole('button',{name:/^Open /}).first().click();await page.getByText('Stored snapshot signature verified.',{exact:false}).waitFor();});
add('homeowner','/payments/return','homeowner-payment-receipt','Actual reconciled local-provider fixture receipt');
add('homeowner','/billing','homeowner-wallet-quote','Itemized actual API quote; not payment',async page=>{await page.getByLabel('Amount in naira').fill('1000');await page.getByLabel('Receipt email').fill('gallery@example.test');await page.getByRole('button',{name:'Get itemized quote',exact:true}).click();await page.getByRole('heading',{name:'Your quote',exact:true}).waitFor();});
add('homeowner',`/payments/transfer/${f.payment_quote_id}`,'bank-transfer-unavailable','Explicitly unavailable transfer adapter');
add('landlord','/dashboard/landlord','landlord-overview','Actual building records');
add('landlord',`/dashboard/landlord/buildings/${f.building_id}/rooms`,'landlord-rooms','Actual room claim/invitation and approved central destination');
add('landlord','/dashboard/landlord/buildings/new','landlord-new-building','Building setup form');
add('landlord','/dashboard/properties','landlord-properties-alias','Alias of landlord overview');
for(const [url,name] of [['/dashboard/tenant','resident-overview'],['/billing','resident-wallet'],['/history','resident-history']])add('tenant',url,name,'Current occupancy only; recently joined QA resident');
add('ops','/ops','operations-overview','Actual shared isolated QA fleet/work records');
add('ops','/communications','operations-notice-preview','Actual scoped audience preview and committed QA notice history',async page=>{
  await page.getByLabel(new RegExp(f.home_device_id)).check();await page.getByLabel('Notice title',{exact:true}).fill('Connection service review');await page.getByLabel('Service message',{exact:true}).fill('Please review the recorded connection observations in your account. This is an isolated QA preview.');await page.getByRole('button',{name:'Preview current audience',exact:true}).click();await page.getByRole('heading',{name:'Review before sending',exact:true}).waitFor();
});
add('engineer','/ops/firmware','engineering-firmware','Real compiled ESP binary signed/uploaded; pending QA canary, no boot confirmation');
add('installer','/portal','installer-assignments','Actual assigned QA work order');
add('installer',`/portal/jobs/${f.job_id}`,'installer-work-order','Versioned actual work record');
add('utility','/dashboard/utility','utility-overview','Assigned-device scope; private customer identity excluded');
add('utility','/communications','utility-notice-preview','Reviewed QA authority and explicit customer opt-in',async page=>{
  await page.getByLabel('Reviewed utility organization').selectOption(f.utility_organization_id);await page.getByLabel(new RegExp(f.home_device_id)).check();await page.getByLabel('Notice title',{exact:true}).fill('Scoped utility service notice');await page.getByLabel('Service message',{exact:true}).fill('A connection service review is planned for your assigned device. This is an isolated QA preview.');await page.getByRole('button',{name:'Preview current audience',exact:true}).click();await page.getByRole('heading',{name:'Review before sending',exact:true}).waitFor();
});
add('admin','/communications','admin-messaging-grants','Reviewed grant history and versioned authority form');
add('admin',`/admin/organizations/${f.utility_organization_id}`,'organization-admin-unavailable','Explicitly unavailable organization-management workflow');
add('ops','/ops/incidents/qa-unimplemented','incident-detail-unavailable','Explicitly unavailable incident-detail workflow');
add('support','/communications','support-service-messages','Implemented service composer; not a complete support case panel');
add('onboarding','/account/complete-profile','account-complete-profile','Real verified email identity awaiting explicit profile/consent');
const browser=await chromium.launch({headless:true});const captures=[];
try{
  for(const view of views){
    const context=await browser.newContext({viewport:{width:1440,height:1080},timezoneId:'Africa/Lagos'}),page=await context.newPage();
    await page.addInitScript(payment=>sessionStorage.setItem('smartclamp_payment',JSON.stringify(payment)),f.payment);
    if(view.role!=='public'){
      const user=f.users[view.role];await page.goto(origin+'/login');await page.getByLabel('Phone number').fill(user.phone||user.email);await page.getByLabel('Password',{exact:true}).fill(user.password);await page.getByRole('button',{name:'Log in',exact:true}).click();await page.waitForURL(/\/(dashboard|ops|portal|communications|account\/complete-profile)/);
    }
    await page.goto(origin+view.url);await page.waitForLoadState('networkidle');
    if(new URL(page.url()).pathname!==new URL(view.url,origin).pathname)throw new Error('Unexpected route for '+view.name);
    if(view.prepare){await view.prepare(page);await page.waitForLoadState('networkidle');}
    const alerts=(await page.locator('[role="alert"]').allTextContents()).filter(text=>text.trim());
    if(alerts.length && !['public-oauth-expired','bank-transfer-unavailable'].includes(view.name))throw new Error('Unexpected dashboard error for '+view.name);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    if(overflow)throw new Error('Page overflow for '+view.name);
    await page.evaluate(()=>{const note=document.createElement('div');note.textContent='ISOLATED QA • Signed simulated readings / local payment fixtures • No live hardware or merchant';Object.assign(note.style,{position:'fixed',bottom:'0',left:'0',right:'0',padding:'10px',background:'#112e26',color:'#fff',font:'12px sans-serif',textAlign:'center',zIndex:'99999'});document.body.append(note);});
    const file=view.name+'.jpg';await page.screenshot({path:path.join(out,file),type:'jpeg',quality:80,fullPage:true,animations:'disabled'});
    captures.push({role:view.role,name:view.name,file,state:view.state,route:view.url.includes('/verification-reports/')?'/verification-reports/[token]':view.url});
    if(['homeowner-overview','homeowner-wallet','operations-notice-preview','utility-notice-preview'].includes(view.name)){
      await page.setViewportSize({width:390,height:844});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Mobile overflow for '+view.name);
      const mobile=view.name+'-mobile.jpg';await page.screenshot({path:path.join(out,mobile),type:'jpeg',quality:80,fullPage:true,animations:'disabled'});captures.push({role:view.role,name:view.name+'-mobile',file:mobile,state:view.state,route:view.url});
    }
    console.log('Captured '+view.name);await context.close();
  }
}finally{await browser.close();}
fs.writeFileSync(path.join(out,'captures.json'),JSON.stringify(captures,null,2)+'\n');
const escape=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const roles=[...new Set(captures.map(c=>c.role))];
const cards=captures.map(c=>`<article data-role="${escape(c.role)}"><a href="${c.file}"><img loading="lazy" src="${c.file}" alt="${escape(c.name)}"></a><div><small>${escape(c.role)}</small><h2><a href="${c.file}">${escape(c.name.replace(/-/g,' '))}</a></h2><p>${escape(c.state)}</p></div></article>`).join('\n');
fs.writeFileSync(path.join(out,'gallery.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SmartClamp actual QA page gallery</title><style>body{margin:0;background:#f8faf4;color:#234b3d;font:16px/1.6 system-ui}header{padding:28px 4vw}h1{font-size:32px}h2{font-size:17px;margin:4px 0}a{color:inherit}select{padding:10px;font:inherit}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;padding:0 4vw 48px}article{background:white;border:1px solid #e3e9dc;border-radius:16px;overflow:hidden}article img{width:100%;height:230px;object-fit:cover;object-position:top;border-bottom:1px solid #e3e9dc}article div{padding:16px}small{text-transform:uppercase}article[hidden]{display:none}</style><header><h1>SmartClamp · ${captures.length} actual page captures</h1><p>Isolated QA only. Signed simulated telemetry, local provider fixtures and explicitly marked unavailable features. No live hardware or merchant success is represented. Click a page to inspect the full screenshot.</p><label>Workspace <select id="role"><option value="workspaces">Dashboards and accounts</option><option value="all">All pages</option>${roles.map(r=>`<option>${r}</option>`).join('')}</select></label></header><main>${cards}</main><script>const filter=()=>{const role=document.querySelector('#role').value;document.querySelectorAll('article').forEach(card=>card.hidden=role==='workspaces'?card.dataset.role==='public':role!=='all'&&card.dataset.role!==role)};document.querySelector('#role').onchange=filter;filter()</script></html>`);
const rows=captures.map(c=>`| ${c.role} | [${c.name.replace(/-/g,' ')}](${c.file}) | ${c.state} |`).join('\n');
fs.writeFileSync(path.join(out,'INDEX.md'),`# All ${captures.length} captured pages\n\n[Open the filterable visual gallery](gallery.html). Every image is an actual browser capture, not a generated design. Read [capture limits and reproduction](README.md).\n\n| Workspace | Screenshot | Actual state |\n|---|---|---|\n${rows}\n`);
console.log('Gallery complete: '+captures.length+' captures');
