// Append actual production-build QA captures without replacing the approved baseline gallery.
import {chromium} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {writeGallery} from './gallery-index.mjs';
const fixture=process.env.SMARTCLAMP_BROWSER_FIXTURE,origin=process.env.UI_BASE_URL||'http://127.0.0.1:3100';
if(!fixture || !path.resolve(fixture).startsWith('/tmp/') || !['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw new Error('An isolated local QA fixture is required');
const f=JSON.parse(fs.readFileSync(fixture,'utf8')),out=path.resolve('../../docs/screenshots');
const captures=JSON.parse(fs.readFileSync(path.join(out,'captures.json'),'utf8')),updates=[];
const browser=await chromium.launch({headless:true});
async function login(user){
 const context=await browser.newContext({viewport:{width:1440,height:1080},timezoneId:'Africa/Lagos'}),page=await context.newPage();
 await page.goto(origin+'/login');await page.getByLabel('Phone number').fill(user.phone||user.email);await page.getByLabel('Password',{exact:true}).fill(user.password);await page.getByRole('button',{name:'Log in',exact:true}).click();await page.waitForURL(/\/(dashboard|ops|support|disputes)/);return {context,page};
}
async function records(page,endpoint){return page.evaluate(async endpoint=>{const r=await fetch('/api/v1'+endpoint,{headers:{Authorization:'Bearer '+localStorage.getItem('smartclamp_token')}});if(!r.ok)throw new Error('QA record lookup failed');return r.json();},endpoint);}
async function capture(page,role,url,name,heading,mobile=false){
 await page.goto(origin+url);await page.getByRole('heading',{name:heading,exact:true}).waitFor();await page.getByRole('button',{name:'Refresh',exact:true}).waitFor();await page.evaluate(()=>document.fonts.ready);
 if(await page.getByRole('alert').allTextContents().then(a=>a.some(t=>t.trim())))throw new Error('Unexpected page error: '+name);
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Page overflow: '+name);
 await page.evaluate(()=>{const note=document.createElement('div');note.textContent='ISOLATED QA • Local provider fixtures / seeded bills • No live hardware or merchant acceptance';Object.assign(note.style,{position:'fixed',bottom:'0',left:'0',right:'0',padding:'10px',background:'#112e26',color:'#fff',font:'12px sans-serif',textAlign:'center',zIndex:'99999'});document.body.append(note);});
 const file=name+'.jpg';await page.screenshot({path:path.join(out,file),type:'jpeg',quality:80,fullPage:true,animations:'disabled'});updates.push({role,name,file,state:'Actual saved QA workflow, captured 15 November 2026',route:url.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/g,'[id]')});
 if(mobile){await page.setViewportSize({width:390,height:844});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Mobile overflow: '+name);const file=name+'-mobile.jpg';await page.screenshot({path:path.join(out,file),type:'jpeg',quality:80,fullPage:true,animations:'disabled'});updates.push({...updates.at(-1),name:name+'-mobile',file});await page.setViewportSize({width:1440,height:1080});}
 console.log('Captured '+name);
}
try{
 const customer=await login(f.owner),tickets=await records(customer.page,'/support/tickets');const ticket=tickets.items.find(t=>t.subject.startsWith('Browser support workflow'));
 if(!ticket)throw new Error('Run the real support browser journey before capturing');
 await capture(customer.page,'landlord','/support/requests','workflow-customer-support-requests','Support requests');await customer.context.close();
 const support=await login(f.support_reviewer);await capture(support.page,'support','/support/requests','workflow-support-queue','Support requests');await capture(support.page,'support','/support/tickets/'+ticket.id,'workflow-support-case','Your support request',true);await support.context.close();
 const homeowner=await login(f.message_recipient),disputes=await records(homeowner.page,'/disputes');const dispute=disputes.items.find(d=>d.bill_id===f.dispute_bill_id);
 if(!dispute)throw new Error('Run the real dispute browser journey before capturing');
 await capture(homeowner.page,'homeowner','/disputes/'+dispute.id,'workflow-customer-dispute-case','Billing dispute');await capture(homeowner.page,'homeowner','/disputes/'+dispute.id+'/meeting','workflow-customer-meeting','Dispute meeting view');await homeowner.context.close();
 const finance=await login(f.finance_reviewer);await capture(finance.page,'finance','/disputes','workflow-finance-disputes','Billing disputes');await capture(finance.page,'finance','/disputes/'+dispute.id,'workflow-finance-dispute-case','Billing dispute',true);await finance.context.close();
 const ops=await login(f.ops);await capture(ops.page,'ops','/ops','workflow-operations-feedback','Operations');await ops.context.close();
 writeGallery([...captures.filter(c=>!updates.some(u=>u.name===c.name)),...updates],out);console.log('Updated gallery with '+updates.length+' captures');
}finally{await browser.close();}
