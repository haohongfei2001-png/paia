// Current hosted browser tests explicitly use CHROME_PATH. Verify that actual
// executable/display instead of downloading another, unused Chromium build.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
assert.ok(process.env.CHROME_PATH,'the hosted Chrome executable must be selected explicitly');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:false,
 args:['--disable-background-networking','--disable-component-update','--disable-sync','--disable-gpu','--host-resolver-rules=MAP * ~NOTFOUND']});
try{
 const context=await browser.newContext();await context.route(/^https?:\/\//,route=>route.abort());
 const page=await context.newPage();await page.setContent('<!doctype html><p>PAIA synthetic browser preflight</p>');
 assert.equal(await page.locator('p').textContent(),'PAIA synthetic browser preflight');
 console.log('HOSTED_CHROME_LAUNCH_PASS '+browser.version());await context.close();
}finally{await browser.close();}
