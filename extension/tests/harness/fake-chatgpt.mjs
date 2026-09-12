// Shared offline browser harness. Never launches a user's profile or reads credentials.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/hhf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=fileURLToPath(new URL('../..',import.meta.url));
export const pause=ms=>new Promise(r=>setTimeout(r,ms));
const DEFAULT_EVENTUALLY_TIMEOUT=process.env.CI?60000:14000;
export async function eventually(fn,label='synthetic expected state',timeout=DEFAULT_EVENTUALLY_TIMEOUT) {
 const deadline=Date.now()+timeout;while(Date.now()<deadline){if(await fn())return;await pause(100);}assert.fail(label);
}
export function conversation(id,offset=0) {
 return {id,title:'虚构聊天 '+id,base:1609459200+offset,messages:[
  {id:id+'-message-001',text:'虚构多行输入\n第二行\n\n末行'},
  {id:id+'-message-002',text:'完全相同的虚构输入'},
  {id:id+'-message-003',text:'完全相同的虚构输入'}
 ]};
}
function fakePage(c,arrival) {
 const config=JSON.stringify({c,arrival}).replaceAll('<','\\u003c');
 return `<!doctype html><meta charset="utf-8"><title>Fake ChatGPT</title><style>.whitespace-pre-wrap{white-space:pre-wrap}main{min-height:20px}</style><main><div id="messages"></div><div data-message-author-role="assistant" data-message-id="fake-assistant-001"><div class="whitespace-pre-wrap">FAKE_ASSISTANT 不可捕获</div></div><div data-message-author-role="user" data-message-id="fake-editor-001" contenteditable="true"><div class="whitespace-pre-wrap">FAKE_EDITOR 不可捕获</div></div><textarea>FAKE_DRAFT 未发送</textarea></main><script>
 const config=${config}; let loaded=false; window.historyGateActive=false;
 window.fake={
  render(c){document.title=c.title+' - ChatGPT';const container=document.getElementById('messages');container.replaceChildren();for(const m of c.messages){const role=document.createElement('div');role.dataset.messageAuthorRole='user';role.dataset.messageId=m.id;const text=document.createElement('div');text.className='whitespace-pre-wrap';text.textContent=m.text;role.append(text);container.append(role);}},
  edit(id,text,editing){const role=[...document.querySelectorAll('[data-message-id]')].find(n=>n.dataset.messageId===id);role.querySelector('.whitespace-pre-wrap').textContent=text;if(editing)role.setAttribute('contenteditable','true');else role.removeAttribute('contenteditable');},
  async response(){const r=await window.fetch('/backend-api/fixture-history?chat='+config.c.id);await r.text();},
  send(m){const c=document.getElementById('messages'),role=document.createElement('div'),text=document.createElement('div');role.dataset.messageAuthorRole='user';role.dataset.messageId=m.id;text.className='whitespace-pre-wrap';text.textContent=m.text;role.append(text);c.append(role);}
 };
 if(config.arrival!=='metadata-first'&&config.arrival!=='empty')window.fake.render(config.c);
 window.addEventListener('message',event=>{
  if(event.source!==window||event.data?.channel!=='archive-response-control-v1')return;
  window.historyGateActive=event.data.active===true&&event.data.history===true&&location.pathname.endsWith('/'+event.data.chat);
  if(!loaded&&window.historyGateActive&&config.arrival==='metadata-first'){
   loaded=true;void window.fake.response().then(()=>{setTimeout(()=>window.fake.render(config.c),300);});
  }
 });
 </script>`;
}
export class FakeChatGPT {
 static async start({extensionPath=root,headless=true,deepSeekFixture=null,onboarding=false}={}) {
  if(process.env.PAIA_HEADLESS==='1')headless=true;
  const h=new FakeChatGPT();h.pages=new Map();h.pending=new Map();h.historyRequests=0;h.externalRequests=0;h.extensionNetworkRequests=0;h.deepSeekRequests=[];h.errors=[];
  h.manifest=JSON.parse(await readFile(extensionPath+'/manifest.json','utf8'));
  h.context=await chromium.launchPersistentContext('',{headless,acceptDownloads:true,
   executablePath:process.env.CHROME_PATH||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined),
   ignoreDefaultArgs:['--disable-extensions'],args:['--enable-unsafe-extension-debugging','--disable-background-networking','--disable-component-update','--disable-sync','--host-resolver-rules=MAP * ~NOTFOUND']});
  try {
   await h.context.route(/^https?:\/\//,async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.origin==='https://api.deepseek.com'&&request.serviceWorker()&&deepSeekFixture){h.extensionNetworkRequests++;const body=JSON.parse(request.postData()||'{}');h.deepSeekRequests.push(body);return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(await deepSeekFixture(body))});}
    if(url.origin!=='https://chatgpt.com'){h.externalRequests++;return route.abort();}
    if(request.serviceWorker()){h.extensionNetworkRequests++;return route.abort();}
    if(url.pathname==='/backend-api/fixture-history'){
     h.historyRequests++;const id=url.searchParams.get('chat');const pending=h.pending.get(id);
     const c=h.pages.get(id)?.c;const value=pending??(c?h.response(c):{});h.pending.delete(id);
     return route.fulfill({contentType:'application/json',body:typeof value==='string'?value:JSON.stringify(value)});
    }
    const id=url.pathname.split('/').at(-1),entry=h.pages.get(id);
    if(!entry)return route.abort();
    return route.fulfill({contentType:'text/html',body:fakePage(entry.c,entry.arrival)});
   });
   h.cdp=await h.context.browser().newBrowserCDPSession();
   const {id}=await h.cdp.send('Extensions.loadUnpacked',{path:extensionPath});h.extensionId=id;
   h.archive=await h.context.newPage();h.archive.on('pageerror',e=>h.errors.push(e.message));await h.archive.goto(`chrome-extension://${id}/ui/archive.html`);
   if(!onboarding&&await h.archive.locator('#onboarding-start').count()){await h.archive.locator('#onboarding-start').click();await h.archive.locator('#consent-check').waitFor();}
   return h;
  }catch(e){await h.context.close();throw e;}
 }
 response(c) {
  const keys=['first','second','third'];
  return {conversation_id:c.id,mapping:Object.fromEntries([
   ...c.messages.map((m,i)=>[keys[i]||'node'+i,{message:{id:m.id,author:{role:'user'},create_time:c.base+i*60,update_time:c.base+i*60+1,content:{parts:['FAKE_RESPONSE_BODY_NEVER_ARCHIVED']}}}]),
   ['assistant',{message:{id:c.id+'-assistant',author:{role:'assistant'},create_time:c.base+1,content:{parts:['FAKE_ASSISTANT_RESPONSE']}}}]
  ])};
 }
 async open(c,{arrival='metadata-first'}={}) {
  this.pages.set(c.id,{c,arrival});const page=await this.context.newPage();page.on('pageerror',e=>this.errors.push(e.message));await page.goto('https://chatgpt.com/c/'+c.id);return page;
 }
 async ready(page){await page.waitForFunction(()=>window.historyGateActive===true);}
 async render(page,c){await page.evaluate(c=>window.fake.render(c),c);}
 async respond(page,c,value=this.response(c)) {
  this.pending.set(c.id,value);
  await page.evaluate(id=>window.fetch('/backend-api/fixture-history?chat='+id).then(r=>r.text()).then(()=>undefined),c.id);
 }
 async edit(page,id,text,editing){await page.evaluate(args=>window.fake.edit(...args),[id,text,editing]);}
 async send(page,message){await page.evaluate(m=>window.fake.send(m),message);}
 async draft(page,text){await page.locator('textarea').fill(text);}
 async spa(page,c) {
  this.pages.set(c.id,{c,arrival:'manual'});
  await page.evaluate(id=>{window.historyGateActive=false;history.pushState({},'', '/c/'+id);document.getElementById('messages').replaceChildren();document.querySelector('[data-message-author-role="user"][contenteditable]')?.remove();},c.id);
  await pause(750);await this.render(page,c);
 }
 async state(){const r=await this.archive.evaluate(()=>chrome.runtime.sendMessage({type:'GET_STATE'}));assert.equal(r.ok,true);return r.data;}
 async restartWorker() {
  const url=`chrome-extension://${this.extensionId}/background/service-worker.js`;
  const worker=this.context.serviceWorkers().find(w=>w.url()===url);assert.ok(worker);
  await worker.evaluate(()=>{globalThis.__fakeLifetimeMarker=true;});
  const c=await this.context.newCDPSession(this.archive);const versions=[];
  c.on('ServiceWorker.workerVersionUpdated',e=>versions.push(...e.versions.filter(v=>v.scriptURL===url)));
  try {
   await c.send('ServiceWorker.enable');await eventually(()=>versions.some(v=>v.runningStatus==='running'));
   const version=versions.at(-1).versionId;versions.length=0;
   await c.send('ServiceWorker.stopWorker',{versionId:version});
   await eventually(()=>versions.some(v=>v.runningStatus==='stopped'),'worker must emit stopped');
   await this.state();await eventually(()=>versions.at(-1)?.runningStatus==='running','worker must wake');
   const awake=this.context.serviceWorkers().find(w=>w.url()===url);assert.ok(awake);
   assert.equal(await awake.evaluate(()=>typeof globalThis.__fakeLifetimeMarker),'undefined','worker heap must be fresh even when Chrome reuses target ID');
  }finally{await c.detach();}
 }
 async download(format) {
  if(!await this.archive.locator('#export-'+format).isVisible())await this.archive.locator('#export-menu > summary').click();
  const promise=this.archive.waitForEvent('download');await this.archive.locator('#export-'+format).click();
  const download=await promise;return readFile(await download.path(),'utf8');
 }
 async close(){await this.context.close();}
}