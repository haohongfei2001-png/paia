// Current hosted browser tests explicitly use CHROME_PATH. Verify that actual
// executable/display instead of downloading another, unused Chromium build.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
assert.ok(process.env.CHROME_PATH,'the hosted Chrome executable must be selected explicitly');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:false,
 args:['--disable-background-networking','--disable-component-update','--disable-sync','--disable-gpu','--host-resolver-rules=MAP * ~NOTFOUND']});
try{
 const context=await browser.newContext();await context.route(/^https?:\/\//,route=>route.abort());
 const page=await context.newPage();await page.setContent("<!doctype html><p id='latin'>PAIA synthetic browser preflight</p><p id='cjk' style='font-family: WenQuanYi Zen Hei'>中文档案</p>");
 assert.equal(await page.locator('#latin').textContent(),'PAIA synthetic browser preflight');
 await page.evaluate(()=>document.fonts.ready);
 const cdp=await context.newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
 const {root}=await cdp.send('DOM.getDocument'),{nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#cjk'});
 const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});
 assert.ok(fonts.some(font=>/WenQuanYi/i.test(font.familyName)&&font.glyphCount>=4),'CJK text must use the installed Chinese font, not missing-glyph boxes');
 await cdp.detach();
 console.log('HOSTED_CHROME_LAUNCH_PASS '+browser.version());await context.close();
}finally{await browser.close();}
