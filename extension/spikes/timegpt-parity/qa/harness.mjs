import {mkdir,lstat,readdir,readFile,writeFile,copyFile,chmod} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {targetURL,alias,configFor,validConfig,safeReport,readSafePanel,verdict} from './safe.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/hhf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
export const project=fileURLToPath(new URL('../../..',import.meta.url));
const extension=fileURLToPath(new URL('..',import.meta.url));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function directory(path){await mkdir(path,{recursive:true,mode:0o700});if(!(await lstat(path)).isDirectory()||(await lstat(path)).isSymbolicLink())throw Error('PROFILE_REFUSED');await chmod(path,0o700);}
export async function launchQA({base=project,headless=false,beforeLaunch=null}={}){
 // Tests may pass a fresh temporary project root. Production never accepts a profile override.
 const profile=join(base,'tests/qa-browser-profile'),local=join(base,'tests/qa-local');
 await mkdir(join(base,'tests'),{recursive:true});if((await lstat(join(base,'tests'))).isSymbolicLink())throw Error('PROFILE_REFUSED');await directory(profile);await directory(local);
 const marker=join(profile,'.paia-qa-owned');
 try{if((await readFile(marker,'utf8'))!=='PAIA_QA_ONLY\n')throw Error('PROFILE_REFUSED');}
 catch(e){if(e.code!=='ENOENT')throw Error('PROFILE_REFUSED');if((await readdir(profile)).length)throw Error('PROFILE_REFUSED');await writeFile(marker,'PAIA_QA_ONLY\n',{mode:0o600});}
 const staging=join(local,'parity-extension');await directory(staging);
 for(const file of ['manifest.json','contract.js','interceptor.js','dom-adapter.js','content.js'])await copyFile(join(extension,file),join(staging,file));
 await writeFile(join(staging,'qa-status.html'),'<!doctype html><meta charset="utf-8"><title>QA extension check</title><p>Parity QA</p>');
 const context=await chromium.launchPersistentContext(profile,{headless,
  executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ignoreDefaultArgs:['--disable-extensions'],args:['--enable-unsafe-extension-debugging','--disable-background-networking','--disable-component-update','--disable-sync','--password-store=basic','--use-mock-keychain','--restore-last-session']});
 try{
  if(beforeLaunch)await beforeLaunch(context);
  const cdp=await context.browser().newBrowserCDPSession();const {id}=await cdp.send('Extensions.loadUnpacked',{path:staging});
  const probe=await context.newPage();await probe.goto('chrome-extension://'+id+'/qa-status.html');
  const ok=await probe.evaluate(()=>{const m=chrome.runtime.getManifest();return m.name==='PAIA TimeGPT Parity Spike'&&m.version==='0.1.0'&&!m.background&&!m.permissions;});
  await probe.goto('chrome://extensions/');
  const onlyParity=await probe.evaluate(expected=>new Promise(resolve=>chrome.developerPrivate.getExtensionsInfo({includeDisabled:false,includeTerminated:false},items=>resolve(items.length===1&&items[0].id===expected&&items[0].state==='ENABLED'))),id);
  await probe.close();
  if(!onlyParity)throw Error('EXTENSION_VERIFY_FAILED');
  if(!ok)throw Error('EXTENSION_VERIFY_FAILED');
  return {context,local,profile,extensionId:id,onlyParity,async close(){await context.close();}};
 }catch(e){await context.close();throw e;}
}
export async function loadTarget(local){try{const c=JSON.parse(await readFile(join(local,'target.json'),'utf8'));return validConfig(c)?c:null;}catch(e){if(e.code==='ENOENT')return null;throw Error('INVALID_TARGET');}}
export async function saveTarget(local,url,mode){const c=configFor(url,mode);await writeFile(join(local,'target.json'),JSON.stringify(c),{mode:0o600});await chmod(join(local,'target.json'),0o600);return c;}
export async function locateTarget(context,config){
 if(config.mode==='url')return config.url;
 for(const page of context.pages()){
  const current=targetURL(page.url());if(current&&alias(current,config.salt)===config.alias)return current;
  if(!page.url().startsWith('https://chatgpt.com/'))continue;
  const links=await page.evaluate(()=>Array.from(document.querySelectorAll('a[href^="/c/"],a[href^="/g/"]')).slice(0,1000).map(a=>a.getAttribute('href'))).catch(()=>[]);
  for(const link of links){const url=targetURL('https://chatgpt.com'+link);if(url&&alias(url,config.salt)===config.alias)return url;}
 }
 return null;
}
export async function smoke(page,url,{timeout=45000,minWait=12000,stableFor=3000,onReport=()=>{}}={}){
 onReport(safeReport('RUNNING','SMOKE_RUNNING'));
 try{
  if(!targetURL(url))return safeReport('FAIL','INVALID_TARGET');
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  const cdp=await page.context().newCDPSession(page);
  try{await cdp.send('Page.enable');const loaded=page.waitForEvent('domcontentloaded',{timeout:60000});await cdp.send('Page.reload',{ignoreCache:true});await loaded;}finally{await cdp.detach();}
  const begin=Date.now();let previous='',since=begin,counts=null;
  while(Date.now()-begin<timeout){
   if(page.isClosed())return safeReport('FAIL','BROWSER_CLOSED');
   const p=new URL(page.url());if(p.origin!=='https://chatgpt.com'||/^\/auth\//.test(p.pathname))return safeReport('WAITING','AUTH_REQUIRED');
   if(targetURL(page.url())!==url){await sleep(300);continue;}
   counts=await page.evaluate(readSafePanel).catch(()=>null);
   const signature=JSON.stringify(counts);if(signature!==previous){previous=signature;since=Date.now();}
   if(counts?.ready&&Date.now()-begin>=minWait&&Date.now()-since>=stableFor&&(counts.matched>0&&counts.candidates>0))return verdict(counts);
   await sleep(300);
  }
  const login=await page.locator('[data-testid="login-button"]').count().catch(()=>0);
  if(login)return safeReport('WAITING','AUTH_REQUIRED');
  return verdict(counts);
 }catch{return safeReport('FAIL','NAVIGATION_FAILED');}
}
