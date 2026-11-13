import {test,expect} from '@playwright/test';
import fs from 'node:fs';
test('installed shell offers an offline fallback and never caches account/API responses',async({page,context,request})=>{
  const manifest=await (await request.get('/manifest.webmanifest')).json();expect(manifest.display).toBe('standalone');
  for(const icon of manifest.icons){const response=await request.get(icon.src);expect(response.ok()).toBeTruthy();expect(response.headers()['content-type']).toContain('image/png');}
  await page.goto('/');await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  const fixture=process.env.SMARTCLAMP_BROWSER_FIXTURE;
  if(fixture){const f=JSON.parse(fs.readFileSync(fixture,'utf8'));await page.goto('/login');await page.getByLabel('Phone number').fill(f.owner.phone);await page.getByLabel('Password',{exact:true}).fill(f.owner.password);await page.getByRole('button',{name:'Log in',exact:true}).click();await expect(page).toHaveURL(/dashboard/);await page.goto('/billing');await page.waitForLoadState('networkidle');}
  const cached=await page.evaluate(async()=>{const result:string[]=[];for(const name of await caches.keys()){if(name.startsWith('smartclamp-public-')){const cache=await caches.open(name);result.push(...(await cache.keys()).map(key=>new URL(key.url).pathname));}}return result;});
  expect(cached).toContain('/offline.html');expect(cached.every(path=>path==='/offline.html' || path.startsWith('/pwa-icons/') || path.startsWith('/_next/static/'))).toBeTruthy();
  await context.setOffline(true);
  const apiFailed=await page.evaluate(async()=>{try{await fetch('/api/v1/users/me/context',{cache:'no-store'});return false;}catch{return true;}});expect(apiFailed).toBeTruthy();
  const paymentFailed=await page.evaluate(async()=>{try{await fetch('/api/v1/payments/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});return false;}catch{return true;}});expect(paymentFailed).toBeTruthy();
  await page.goto('/control');await expect(page.getByRole('heading',{name:'You’re offline.',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Send confirmation code',exact:true})).toHaveCount(0);
  await context.setOffline(false);await page.goto('/login');await expect(page.getByRole('heading',{name:'Your home, in focus.',exact:true})).toBeVisible();
});
