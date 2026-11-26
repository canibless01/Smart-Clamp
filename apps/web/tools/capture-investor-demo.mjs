// Actual captures of the isolated /demo UI. No production session or API fixtures.
import {chromium} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const origin=process.env.UI_BASE_URL||'http://127.0.0.1:3000';if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw new Error('Use a local demo server');
const out=path.resolve('../../docs/investor-demo/screenshots');fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const captures=[];
async function save(file,title){await page.evaluate(()=>document.fonts.ready);if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Overflow: '+file);await page.screenshot({path:path.join(out,file+'.jpg'),type:'jpeg',quality:85,fullPage:true,animations:'disabled'});captures.push({file:file+'.jpg',title});console.log('Captured '+file);}
try{
 await page.goto(origin+'/demo');await page.getByRole('heading',{name:'See your electricity clearly.',exact:true}).waitFor();await page.getByRole('region',{name:'Voltage instrument',exact:true}).waitFor();await save('01-monitoring','Supply present, voltage, current, real power and independent room credit');
 for(const [scenario,file,title] of [['outage','02-no-supply','Electricity absent: grid supply and relay position are different'],['low','03-low-voltage','Low-voltage warning with simulated protection'],['high','04-high-voltage','High-voltage warning with simulated protection']]){await page.getByRole('combobox',{name:'Supply scenario',exact:true}).selectOption(scenario);await save(file,title);}
 await page.getByRole('button',{name:'Reset walkthrough',exact:true}).click();await page.getByRole('combobox',{name:'Workspace',exact:true}).selectOption('landlord');await page.getByRole('button',{name:'Rooms & usage',exact:true}).click();await save('05-room-monitoring','Landlord monitoring of three rooms; no tenant wallet spending or switching authority');
 await page.getByRole('combobox',{name:'Workspace',exact:true}).selectOption('tenant');await page.getByRole('button',{name:'Buy electricity',exact:true}).click();await page.getByRole('button',{name:'Buy units',exact:true}).click();await save('06-tenant-purchase','An individual tenant purchase credits only that tenant’s SmartClamp');
 await page.getByRole('checkbox',{name:'Allocate this joint purchase across rooms'}).check();await save('07-joint-purchase-concept','Optional joint-purchase allocation concept; production flow not implemented');
 await page.getByRole('button',{name:'Power control',exact:true}).click();await page.getByRole('switch',{name:'Room power',exact:true}).click();await save('08-power-control','Pending relay request, requiring explicit isolated QA feedback; no hardware action');
 await page.getByRole('button',{name:'Reset walkthrough',exact:true}).click();await page.setViewportSize({width:390,height:844});await save('09-monitoring-mobile','Phone-sized investor walkthrough');
 fs.writeFileSync(path.join(out,'captures.json'),JSON.stringify(captures,null,2)+'\n');
}finally{await browser.close();}
