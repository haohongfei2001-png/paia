import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
let playwright;
if(process.env.PLAYWRIGHT_MODULE)playwright=require(process.env.PLAYWRIGHT_MODULE);
else{try{playwright=require('playwright');}catch{playwright=require('/Users/hhf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');}}
const {chromium}=playwright;
const contractSource=await readFile(new URL('../adapter/source-structure-contract.js',import.meta.url),'utf8');
const providerSource=await readFile(new URL('../adapter/chatgpt-source-structure.js',import.meta.url),'utf8');
let browser;

before(async()=>{browser=await chromium.launch({
  headless:true,
  executablePath:process.env.CHROME_PATH||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined),
  args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-default-browser-check']
});});
after(async()=>{await browser?.close();});

const chat='cpr02-lifecycle-chat-001';
const projectA='g-p-'+'a'.repeat(32);
const projectB='g-p-'+'b'.repeat(32);
const session='cpr02-browser-session';
const status={enabled:true,consented:true,adapterVersion:'0.3.0',epoch:17};
const segment=(id,slug)=>id+'-'+slug;

async function fixture(){
  const page=await browser.newPage();
  const body='<!doctype html><html><head><style>header,a{display:block;min-height:8px}</style></head><body><header id="project-header"></header><main></main></body></html>';
  await page.route('**/*',route=>{
    if(route.request().isNavigationRequest()&&route.request().url().startsWith('https://chatgpt.com/')){
      void route.fulfill({status:200,contentType:'text/html',body});
      return;
    }
    void route.abort();
  });
  await page.goto('https://chatgpt.com/g/'+segment(projectA,'alpha')+'/c/'+chat,{waitUntil:'domcontentloaded'});
  await page.addScriptTag({content:contractSource});
  await page.addScriptTag({content:providerSource});
  await page.evaluate(({projectA})=>{
    const a=document.createElement('a');
    a.id='project-home';
    a.href='/g/'+projectA+'-alpha/project';
    a.textContent='Project Alpha';
    document.getElementById('project-header').append(a);
  },{projectA});
  return page;
}

async function observe(page){
  return page.evaluate(({chat,session,status})=>{
    const adapter={
      version:'0.3.0',
      route:()=>({code:'READY',id:chat,url:'https://chatgpt.com/c/'+chat}),
      visible:node=>node.isConnected&&node.getClientRects().length>0
    };
    window.__cpr02Source??=new window.ChatGPTSourceStructure({
      adapter,clock:()=>new Date().toISOString(),document:window.document,location:window.location
    });
    return window.__cpr02Source.observe(status,{session});
  },{chat,session,status});
}

test('CPR-02 same Conversation reconciles Project move, rename, unassigned and temporary evidence loss without false facts',async()=>{
  const page=await fixture();
  try{
    let emitted=await observe(page);
    assert.equal(emitted.dtos.length,2);
    assert.equal(emitted.dtos.find(x=>x.capability==='membership').observation.membership.projectId,projectA);
    assert.equal(emitted.dtos.find(x=>x.capability==='projectName').observation.currentName,'Project Alpha');
    assert.equal(await observe(page),null,'unchanged Project state does not re-emit');

    await page.evaluate(()=>{document.getElementById('project-home').textContent='Project Alpha Renamed';});
    emitted=await observe(page);
    assert.equal(emitted.dtos.find(x=>x.capability==='membership').observation.projectName,'Project Alpha Renamed');
    assert.equal(emitted.dtos.find(x=>x.capability==='projectName').observation.currentName,'Project Alpha Renamed');

    await page.evaluate(()=>document.getElementById('project-home').remove());
    assert.equal(await observe(page),null,'missing strong Project-home evidence preserves prior state');
    await page.evaluate(({projectA})=>{
      const a=document.createElement('a');a.id='project-home';
      a.href='/g/'+projectA+'-alpha/project';a.textContent='Project Alpha Renamed';
      document.getElementById('project-header').append(a);
    },{projectA});
    assert.equal(await observe(page),null,'restoring identical strong evidence creates no duplicate observation');

    await page.evaluate(({projectB,chat})=>{
      history.pushState({},'', '/g/'+projectB+'-beta/c/'+chat);
      const a=document.getElementById('project-home');
      a.href='/g/'+projectB+'-beta/project';a.textContent='Project Beta';
    },{projectB,chat});
    emitted=await observe(page);
    assert.equal(emitted.dtos.find(x=>x.capability==='membership').observation.membership.projectId,projectB);
    assert.equal(emitted.dtos.find(x=>x.capability==='projectName').observation.currentName,'Project Beta');

    await page.evaluate(({chat})=>{
      history.pushState({},'', '/c/'+chat);
      document.getElementById('project-home')?.remove();
    },{chat});
    emitted=await observe(page);
    assert.equal(emitted.dtos.length,1);
    assert.equal(emitted.dtos[0].contractId,'chatgpt.current-project-absence');
    assert.deepEqual(emitted.dtos[0].observation,{membership:{state:'unassigned'}});
    assert.equal(await observe(page),null,'unchanged plain route creates no duplicate observation');

    await page.evaluate(({chat})=>history.pushState({},'', '/g/g-custom-fixture/c/'+chat),{chat});
    emitted=await observe(page);
    assert.equal(emitted.dtos.length,1);
    assert.equal(emitted.dtos[0].capability,'conversationIdentity','custom GPT remains insufficient Project evidence');

    await page.evaluate(({projectB,chat})=>history.pushState({},'', '/g/'+projectB+'-beta/c/'+chat),{projectB,chat});
    assert.equal(await observe(page),null,'Project route without matching home evidence does not invent membership');
    await page.evaluate(({projectB})=>{
      const a=document.createElement('a');a.id='project-home';
      a.href='/g/'+projectB+'-beta/project';a.textContent='Project Beta';
      document.getElementById('project-header').append(a);
    },{projectB});
    emitted=await observe(page);
    assert.equal(emitted.dtos.find(x=>x.capability==='membership').observation.membership.projectId,projectB);
  }finally{await page.close();}
});
