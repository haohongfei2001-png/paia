import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {mkdtemp,cp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/hhf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=fileURLToPath(new URL('..',import.meta.url));
const chat='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const id=i=>`aaaaaaaa-aaaa-4aaa-8aaa-${String(i).padStart(12,'0')}`;
const payload=(c=chat,n=20)=>({conversation_id:c,mapping:Object.fromEntries(Array.from({length:n+1},(_,i)=>['node'+i,{message:{id:id(i),author:{role:i===n?'assistant':'user'},create_time:1609459200+i*60,content:{parts:['SYNTHETIC_PRIVATE_BODY']}}}]))});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label='expected state'){for(let n=0;n<100;n++){if(await fn())return;await sleep(50);}assert.fail(label);}
async function start({early=false,noDrain=false,response=payload()}={}){
 const tmp=await mkdtemp(join(tmpdir(),'paia-parity-'));let context;
 try{
  let path=root;
  if(noDrain){path=join(tmp,'extension');await cp(root,path,{recursive:true});const p=join(path,'content.js');await writeFile(p,(await readFile(p,'utf8')).replace("type:'parity-drain-v1'","type:'parity-disabled-test'"));}
  context=await chromium.launchPersistentContext('',{headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',ignoreDefaultArgs:['--disable-extensions'],args:['--enable-unsafe-extension-debugging','--disable-background-networking','--disable-component-update','--disable-sync','--host-resolver-rules=MAP * ~NOTFOUND']});
  const h={context,tmp,requests:0,unexpected:0,errors:[],early,response,release:null};
  await context.route(/^https?:\/\//,async route=>{
   const u=new URL(route.request().url());if(u.origin!=='https://chatgpt.com'){h.unexpected++;return route.abort();}
   if(u.pathname.startsWith('/backend-api/conversation/')){h.requests++;return route.fulfill({contentType:'application/json',body:JSON.stringify(h.response)});}
   if(u.pathname==='/hold.js'){h.release=()=>route.fulfill({contentType:'text/javascript',body:''});return;}
   if(!u.pathname.startsWith('/c/')){h.unexpected++;return route.abort();}
   const script=`window.dataEvents=0;window.drainEvents=0;window.addEventListener('message',e=>{if(e.data?.type==='parity-data-v1')window.dataEvents++;if(e.data?.type==='parity-drain-v1')window.drainEvents++;});window.consume=()=>fetch('/backend-api/conversation/'+location.pathname.split('/').at(-1)).then(r=>r.json()).then(j=>{window.consumed=j.mapping!==undefined;});${h.early?'void window.consume();':''}`;
   const html=`<!doctype html><html><head><script>${script}</script>${h.early?'<script src="/hold.js"></script>':''}</head><body><main>${Array.from({length:21},(_,i)=>`<div data-message-id="${id(i)}" data-message-author-role="${i===20?'assistant':'user'}">SYNTHETIC_DOM_BODY</div>`).join('')}</main><textarea>SYNTHETIC_DRAFT</textarea></body></html>`;
   return route.fulfill({contentType:'text/html',body:html});
  });
  const cdp=await context.browser().newBrowserCDPSession();await cdp.send('Extensions.loadUnpacked',{path});
  h.page=await context.newPage();h.page.on('pageerror',e=>h.errors.push(e.message));
  await h.page.goto('https://chatgpt.com/c/'+chat,{waitUntil:early?'commit':'load'});
  h.text=()=>h.page.locator('#paia-parity-summary').textContent();
  h.match=async n=>{await until(async()=>{const s=await h.text();return s.includes('matched user messages: '+n+'\n');});};
  h.close=async()=>{await context.close();await rm(tmp,{recursive:true,force:true});};
  return h;
 }catch(e){await context?.close();await rm(tmp,{recursive:true,force:true});throw e;}
}
test('MV3 document_start response before isolated: buffer then active drain; immediate consumption; 20 old users only',async()=>{
 const h=await start({early:true});try{
  await until(()=>h.page.evaluate(()=>window.dataEvents>0&&window.consumed===true),'MAIN must finish before isolated starts');
  assert.equal(await h.page.locator('#paia-parity-summary').count(),0);await h.release();await h.match(20);
  const s=await h.text();assert.match(s,/create_time candidates: 20/);assert.match(s,/drain received: yes/);
  assert.equal(h.requests,1);assert.equal(h.unexpected,0);assert.deepEqual(h.errors,[]);
  for(const secret of [chat,id(0),'SYNTHETIC_PRIVATE_BODY','SYNTHETIC_DOM_BODY','1609459200','2021-01-01'])assert.equal(s.includes(secret),false);
 }finally{await h.close();}
});
test('negative control: disabling drain loses metadata delivered before isolated',async()=>{
 const h=await start({early:true,noDrain:true});try{await until(()=>h.page.evaluate(()=>window.dataEvents>0));await h.release();await h.match(0);await sleep(3500);assert.match(await h.text(),/create_time candidates: 0/);assert.equal(h.requests,1);}finally{await h.close();}
});
test('isolated first; repeated load; route prefetch then SPA without another fetch; hard refresh; stop',async()=>{
 const h=await start();try{
  await h.match(0);await h.page.evaluate(()=>window.consume());await h.match(20);
  await h.page.evaluate(()=>window.consume());await h.match(20);assert.equal(h.requests,2);
  h.response=payload(other);await h.page.evaluate(c=>fetch('/backend-api/conversation/'+c).then(r=>r.text()),other);await sleep(150);
  await h.page.evaluate(c=>{history.pushState({},'','/c/'+c);document.querySelector('main').replaceChildren();},other);await h.match(0);
  await h.page.evaluate(ids=>{for(const id of ids){const n=document.createElement('div');n.dataset.messageId=id;n.dataset.messageAuthorRole='user';n.textContent='SYNTHETIC_NEW_DOM';document.querySelector('main').append(n);}},Array.from({length:20},(_,i)=>id(i)));
  await h.match(20);assert.equal(h.requests,3);
  await h.page.reload();await h.match(0);await h.page.evaluate(()=>window.consume());await h.match(20);assert.equal(h.requests,4);
  await h.page.locator('#paia-parity-stop').click();await until(async()=>/status: stopped/.test(await h.text()));
  await h.page.evaluate(()=>window.consume());assert.match(await h.text(),/create_time candidates: 0/);assert.equal(h.requests,5);
  assert.equal(h.unexpected,0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
for(const kind of ['invalid ID','missing time','wrong conversation','duplicate ID'])test('browser rejects '+kind,async()=>{
 const r=payload();if(kind==='invalid ID')r.mapping.node0.message.id='invalid';
 if(kind==='missing time')for(const node of Object.values(r.mapping))delete node.message.create_time;
 if(kind==='wrong conversation')r.conversation_id=other;
 if(kind==='duplicate ID')r.mapping.node1.message.id=id(0);
 const h=await start({response:r});try{await h.match(0);await h.page.evaluate(()=>window.consume());await until(async()=>/observed detail responses: 1/.test(await h.text()));assert.match(await h.text(),/create_time candidates: 0/);assert.equal(h.requests,1);}finally{await h.close();}
});
test('DOM exact matching excludes duplicate, hidden, assistant and editor nodes without reading text',async()=>{
 const h=await start();try{
  await h.match(0);await h.page.evaluate(()=>{
   const main=document.querySelector('main'),nodes=main.querySelectorAll('[data-message-id]');
   const duplicate=nodes[0].cloneNode(true);main.append(duplicate);
   nodes[1].hidden=true;nodes[2].setAttribute('contenteditable','true');
   for(const node of [main,...nodes,document.querySelector('textarea')]){
    for(const property of ['innerText','textContent','value'])Object.defineProperty(node,property,{get(){throw Error('forbidden synthetic text read');}});
   }
  });
  await h.page.evaluate(()=>window.consume());await h.match(17);assert.match(await h.text(),/create_time candidates: 20/);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
test('explicit stop survives page lifecycle restore until hard refresh',async()=>{
 const h=await start();try{await h.match(0);await h.page.evaluate(()=>window.consume());await h.match(20);
  await h.page.locator('#paia-parity-stop').click();await sleep(100);
  await h.page.evaluate(()=>{window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
  await h.page.evaluate(()=>window.consume());await sleep(300);assert.match(await h.text(),/status: stopped/);assert.match(await h.text(),/create_time candidates: 0/);
 }finally{await h.close();}
});
