import {test,expect} from '@playwright/test';
test('UI contract: uncertain readings stay unverified and do not animate measured flow',async({page})=>{
 const at=Date.now();
 const data={authorized_context:{id:'ui-contract-user',role:'homeowner'},allowed_actions:[],usage_history:[],electrical_history:[{at,voltage:null,current:null,power:null}],devices:[{id:'ui-contract-device',role:'pole_device',capabilities:['metering'],supply_state:'present',connectivity:'online',measurement:{value:420,unit:'W',quality:'valid',observed_at:new Date(at).toISOString()},electrical:{voltage_v:230,current_a:2,quality:'valid',clock_quality:'estimated',voltage_status:'unknown',observed_at:new Date(at).toISOString()},relay:{observed:null},wallet:null}]};
 await page.addInitScript(()=>localStorage.setItem('smartclamp_token','ui-contract-token'));
 await page.route('**/api/v1/**',async route=>{if(route.request().url().endsWith('/users/me/context')||route.request().url().endsWith('/dashboard/homeowner'))await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});else await route.fulfill({status:404,contentType:'application/json',body:'{}'});});
 await page.goto('/dashboard/homeowner');await expect(page.getByText('Unverified reading',{exact:true}).first()).toBeVisible();await expect(page.locator('.supply-flow')).not.toHaveClass(/is-flowing/);await expect(page.getByText('Waiting for measured readings',{exact:true})).toHaveCount(3);
});
