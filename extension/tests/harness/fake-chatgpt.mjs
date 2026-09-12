// Shared offline browser harness. Never launches a user's profile or reads credentials.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
let playwright;
try{playwright=require(process.env.PLAYWRIGHT_MODULE||'playwright');}
catch(error){if(process.env.PLAYWRIGHT_MODULE)throw error;playwright=require('/Users/hhf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');}
const {chromium}=playwright;
const root=fileURLToPath(new URL('../..',import.meta.url));
export const pause=ms=>new Promise(r=>setTimeout(r,ms));
export async function eventually(fn,label='synthetic expected state',timeout=14000) {
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
    if(url.origin==='https://chatgpt.com'){
     if(url.pathname.startsWith('/backend-api/fixture-history')){h.historyRequests++;const id=url.searchParams.get('chat'),entry=h.pending.get(id);if(entry){h.pending.delete(id);await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(entry)});return;}}
     const id=url.pathname.split('/').filter(Boolean).at(-1),entry=h.pages.get(id)||{c:{id,title:'Fake ChatGPT',messages:[]},arrival:'normal'};await route.fulfill({status:200,contentType:'text/html',body:fakePage(entry.c,entry.arrival)});return;
    }
    if(url.origin==='https://api.deepseek.com'){
     h.extensionNetworkRequests++;const body=request.postDataJSON?.()||{};h.deepSeekRequests.push(body);if(deepSeekFixture){const response=typeof deepSeekFixture==='function'?await deepSeekFixture(body,h.deepSeekRequests.length):deepSeekFixture;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response)});return;}await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'synthetic provider disabled'})});return;
    }
    h.externalRequests++;await route.abort();
   });
   let workers=h.context.serviceWorkers();if(!workers.length){const trigger=await h.context.newPage();await trigger.goto('https://chatgpt.com/c/bootstrap');await pause(300);workers=h.context.serviceWorkers();await trigger.close();}
   h.worker=workers[0];assert.ok(h.worker,'extension service worker did not start');h.extensionId=new URL(h.worker.url()).host;
   h.archive=await h.context.newPage();await h.archive.goto(`chrome-extension://${h.extensionId}/ui/archive.html${onboarding?'?onboarding=1':''}`);await h.archive.waitForLoadState('domcontentloaded');
   h.archive.on('pageerror',e=>h.errors.push(String(e)));
   return h;
  } catch(error){await h.context.close();throw error;}
 }
 async open(c,{arrival='normal'}={}){this.pages.set(c.id,{c,arrival});if(arrival==='metadata-first')this.pending.set(c.id,{id:c.id,title:c.title,create_time:c.base,mapping:Object.fromEntries(c.messages.map((m,i)=>[m.id,{id:m.id,message:{id:m.id,author:{role:'user'},create_time:c.base+i,content:{content_type:'text',parts:[m.text]}}}]))});let page=this.chat;if(!page||page.isClosed()){page=await this.context.newPage();this.chat=page;}await page.goto('https://chatgpt.com/c/'+c.id);await pause(150);return page;}
 async state(){const response=await this.archive.evaluate(()=>new Promise(resolve=>chrome.runtime.sendMessage({type:'GET_STATE'},resolve)));assert.equal(response.ok,true);return response.data;}
 async close(){await this.context.close();}
}
