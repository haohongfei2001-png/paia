// One anonymous, fresh-profile CURRENT_LIVE attempt. No login, replies or Send.
import {chromium} from 'playwright';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const source=await readFile(new URL('../adapter/chatgpt-composer.js',import.meta.url),'utf8');
const receipt={evidence:'CURRENT_LIVE',at:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),adapterSHA256:createHash('sha256').update(source).digest('hex'),status:'NOT_VERIFIED',sendActions:0,loginUsed:false,attempts:1};
let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});receipt.browser=browser.version();const context=await browser.newContext(),page=await context.newPage();
 const response=await page.goto('https://chatgpt.com/',{waitUntil:'domcontentloaded',timeout:30000});receipt.httpStatus=response?.status()??null;
 try{await page.locator('#prompt-textarea.ProseMirror[contenteditable="true"]').waitFor({state:'visible',timeout:10000});}catch{receipt.reason='supported_composer_unavailable';}
 if(!receipt.reason){
  const cdp=await context.newCDPSession(page),{frameTree}=await cdp.send('Page.getFrameTree');
  const {executionContextId}=await cdp.send('Page.createIsolatedWorld',{frameId:frameTree.frame.id,worldName:'paia-prompt-live-smoke'});
  await cdp.send('Runtime.evaluate',{contextId:executionContextId,expression:source});
  const r=await cdp.send('Runtime.evaluate',{contextId:executionContextId,awaitPromise:true,returnByValue:true,expression:`(async()=>{const adapter=new PAIAChatGPTComposerAdapter();const node=adapter.find();if(!node||adapter.model(node)?.text!=='')return {status:'failed',reason:'nonempty_or_unsupported'};try{return await adapter.insert({text:'PAIA synthetic insertion smoke.\n只插入，不发送。',operationId:crypto.randomUUID(),url:location.href});}finally{adapter.dispose();}})()`});
  receipt.result=r.result.value??{status:'uncertain'};receipt.status=receipt.result.status==='inserted'?'EMPTY_COMPOSER_SMOKE_ONLY':'NOT_VERIFIED';
 }
}catch(error){receipt.reason=error?.name==='TimeoutError'?'site_timeout':'site_unavailable';}
finally{await browser?.close();await mkdir('work/prompt-reuse',{recursive:true});await writeFile('work/prompt-reuse/current-live.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));}
