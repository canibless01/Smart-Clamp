import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const fixture=process.env.SMARTCLAMP_BROWSER_FIXTURE;
test('OneSignal SDK contract: actual private registration, explicit opt-in and logout cleanup',async({page,request})=>{
  test.skip(!fixture,'Requires isolated API/Auth/PostgreSQL');const f=JSON.parse(fs.readFileSync(fixture!,'utf8'));test.skip(!f.onesignal,'Run the QA runner with --onesignal for this separate SDK contract check.');
  // Vendor SDK stand-in only. Server sessions, auth, preferences and role checks are real.
  await page.route('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js',route=>route.fulfill({contentType:'application/javascript',body:`
    const state={options:null,alias:'',permissionCalls:0,optedIn:false};window.__onesignalQa=state;
    const SDK={init:async options=>{state.options=options},login:async alias=>{state.alias=alias},logout:async()=>{state.alias='';localStorage.setItem('smartclamp_qa_logout','done')},Notifications:{requestPermission:async()=>{state.permissionCalls++}},User:{PushSubscription:{get optedIn(){return state.optedIn},optIn:async()=>{state.optedIn=true},optOut:async()=>{state.optedIn=false},addEventListener(){},removeEventListener(){}}}};
    for(const callback of window.OneSignalDeferred||[])callback(SDK);
  `}));
  await page.goto('/login');await page.getByLabel('Phone number').fill(f.owner.phone);await page.getByLabel('Password',{exact:true}).fill(f.owner.password);await page.getByRole('button',{name:'Log in',exact:true}).click();await expect(page).toHaveURL(/dashboard/);await page.goto('/settings');
  await expect(page.getByRole('button',{name:'Set up browser notifications',exact:true})).toBeVisible();expect(await page.evaluate(()=>(window as any).__onesignalQa===undefined)).toBeTruthy();
  await page.getByRole('button',{name:'Set up browser notifications',exact:true}).click();await page.waitForFunction(()=>!!(window as any).__onesignalQa?.alias);
  expect(await page.evaluate(id=>{const s=(window as any).__onesignalQa;return s.options.serviceWorkerParam.scope==='/push/onesignal/' && s.options.serviceWorkerPath==='push/onesignal/OneSignalSDKWorker.js' && s.alias.length>=64 && !s.alias.includes(id) && s.permissionCalls===0;},f.owner.id)).toBeTruthy();
  const worker=await request.get('/push/onesignal/OneSignalSDKWorker.js');expect(worker.ok()).toBeTruthy();expect(worker.headers()['service-worker-allowed']).toBe('/push/onesignal/');
  await page.getByRole('button',{name:'Enable notifications on this device',exact:true}).click();await expect(page.getByRole('button',{name:'Disable notifications on this device',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>(window as any).__onesignalQa.permissionCalls===1)).toBeTruthy();
  let disabled=false;page.on('request',r=>{if(r.url().includes('/users/me/onesignal/devices/') && r.method()==='POST' && r.postDataJSON()?.enabled===false)disabled=true;});
  await page.getByRole('button',{name:'Log out',exact:true}).click();await expect(page).toHaveURL(/\/login$/);expect(disabled).toBeTruthy();expect(await page.evaluate(()=>localStorage.getItem('smartclamp_qa_logout')==='done')).toBeTruthy();
});

test('OneSignal SDK contract: logout cancels an in-progress account login',async({page})=>{
  test.skip(!fixture,'Requires isolated API/Auth/PostgreSQL');const f=JSON.parse(fs.readFileSync(fixture!,'utf8'));test.skip(!f.onesignal,'Requires --onesignal QA fixture');
  await page.route('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js',route=>route.fulfill({contentType:'application/javascript',body:`
    const SDK={init:async()=>{},login:async()=>{window.__onesignalLoggingIn=true;await new Promise(r=>setTimeout(r,1500))},logout:async()=>localStorage.setItem('smartclamp_qa_race_logout','done'),Notifications:{requestPermission:async()=>{}},User:{PushSubscription:{optedIn:false,optIn:async()=>{},optOut:async()=>{}}}};
    for(const callback of window.OneSignalDeferred||[])callback(SDK);
  `}));
  await page.goto('/login');await page.getByLabel('Phone number').fill(f.tenant.phone);await page.getByLabel('Password',{exact:true}).fill(f.tenant.password);await page.getByRole('button',{name:'Log in',exact:true}).click();await expect(page).toHaveURL(/dashboard/);await page.goto('/settings');await page.getByRole('button',{name:'Set up browser notifications',exact:true}).click({noWaitAfter:true});await page.waitForFunction(()=>(window as any).__onesignalLoggingIn===true);
  await page.getByRole('button',{name:'Log out',exact:true}).click();await expect(page).toHaveURL(/\/login$/);expect(await page.evaluate(()=>localStorage.getItem('smartclamp_qa_race_logout')==='done')).toBeTruthy();
});
