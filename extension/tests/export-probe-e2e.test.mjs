import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/hhf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
test('offline Chrome file picker: fresh consent, safe summary, reset, errors, no requests or persistence', {timeout:30000},async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-background-networking','--disable-component-update','--disable-sync','--host-resolver-rules=MAP * ~NOTFOUND']});
 try{
  const context=await browser.newContext();let network=0,downloads=0;await context.route(/^https?:\/\//,route=>{network++;return route.abort();});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.name));page.on('download',()=>downloads++);
  await page.goto(pathToFileURL(resolve('development/export-probe/index.html')).href);
  assert.equal(await page.locator('#choose').isDisabled(),true);
  await page.locator('#consent').check();
  const picker=page.waitForEvent('filechooser');await page.locator('#choose').click();
  await(await picker).setFiles({name:'PRIVATE_FILENAME.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([{id:'PRIVATE_ID',title:'PRIVATE_TITLE',mapping:{'PRIVATE_NODE':{id:'PRIVATE_NODE',parent:null,message:{id:'PRIVATE_MESSAGE',author:{role:'user'},create_time:1609459200,content:{content_type:'text',parts:['PRIVATE_BODY']}}}}}]))});
  await page.waitForFunction(()=>!document.getElementById('summary').hidden);
  const summary=JSON.parse(await page.locator('#summary').textContent());assert.equal(summary.roles.user,1);assert.equal(summary.archiveValidated,false);
  assert.ok(!(await page.locator('body').textContent()).includes('PRIVATE_'));
  assert.equal(await page.locator('#consent').isChecked(),false);assert.equal(await page.locator('#choose').isDisabled(),true);
  await page.locator('#cancel').click();assert.equal(await page.locator('#summary').textContent(),'');
  await page.locator('#consent').check();await page.locator('#file').setInputFiles({name:'synthetic-bad.json',mimeType:'application/json',buffer:Buffer.from('["PRIVATE_RAW_ERROR')});
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('JSON_INVALID'));
  assert.ok(!(await page.locator('body').textContent()).includes('PRIVATE_'));
  await page.reload();assert.equal(await page.locator('#consent').isChecked(),false);assert.equal(await page.locator('#summary').textContent(),'');
  assert.deepEqual(errors,[]);assert.equal(network,0);assert.equal(downloads,0);
 }finally{await browser.close();}
});
