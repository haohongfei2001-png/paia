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

async function fixture(html,url){
  const page=await browser.newPage();
  const body='<!doctype html><html><head><style>header,nav,main,a{display:block;min-height:8px}</style></head><body>'+html+'</body></html>';
  await page.route('**/*',route=>{
    if(route.request().isNavigationRequest()&&route.request().url().startsWith('https://chatgpt.com/')){
      void route.fulfill({status:200,contentType:'text/html',body});
      return;
    }
    void route.abort();
  });
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.addScriptTag({content:contractSource});
  await page.addScriptTag({content:providerSource});
  return page;
}
const projectId='g-p-'+'a'.repeat(32);
const chat='cpr01-browser-chat-001';
const session='cpr01-browser-session';
const status={enabled:true,consented:true,adapterVersion:'0.3.0',epoch:11};

async function observe(page){
  return page.evaluate(({chat,session,status})=>{
    const adapter={
      version:'0.3.0',
      route:()=>({code:'READY',id:chat,url:'https://chatgpt.com/c/'+chat}),
      visible:node=>node.isConnected&&node.getClientRects().length>0
    };
    window.__cpr01Source??=new window.ChatGPTSourceStructure({
      adapter,clock:()=> '2026-09-22T11:10:00.000Z',
      document:window.document,location:window.location
    });
    return window.__cpr01Source.observe(status,{session});
  },{chat,session,status});
}

test('CPR-01 production provider emits only the frozen route + matching Project-home contract',async()=>{
  const segment=projectId+'-synthetic-project';
  const page=await fixture(
    '<header><a href="/g/'+segment+'/project">Synthetic Project</a></header>'+
    '<main><div data-message-author-role="user"><a id="poison" href="/g/'+segment+'/project">PRIVATE BODY PROJECT</a></div></main>',
    'https://chatgpt.com/g/'+segment+'/c/'+chat
  );
  try{
    await page.evaluate(()=>Object.defineProperty(document.getElementById('poison'),'textContent',{
      get(){throw Error('message body must not be read');}
    }));
    const emitted=await observe(page);
    assert.equal(emitted.dtos.length,2);
    const membership=emitted.dtos.find(dto=>dto.capability==='membership');
    const projectName=emitted.dtos.find(dto=>dto.capability==='projectName');
    assert.ok(membership);assert.ok(projectName);
    assert.deepEqual(membership.observation,{
      membership:{state:'project',namespace:'chatgpt-project',projectId},
      projectName:'Synthetic Project'
    });
    assert.equal(projectName.subject.projectId,projectId);
    assert.equal(projectName.subject.witnessConversationId,chat);
    assert.equal(projectName.observation.currentName,'Synthetic Project');
    assert.equal(membership.channel,'route_plus_matching_project_home_link');
  }finally{await page.close();}
});

test('CPR-01 ordinary chat and custom GPT remain identity-only even with visible Project links',async()=>{
  const segment=projectId+'-sidebar-project';
  for(const url of [
    'https://chatgpt.com/c/'+chat,
    'https://chatgpt.com/g/g-custom-fixture/c/'+chat
  ]){
    const page=await fixture('<nav><a href="/g/'+segment+'/project">Sidebar Project</a></nav>',url);
    try{
      const emitted=await observe(page);
      assert.equal(emitted.dtos.length,1);
      assert.equal(emitted.dtos[0].capability,'conversationIdentity');
      assert.deepEqual(emitted.dtos[0].observation,{});
    }finally{await page.close();}
  }
});

test('CPR-01 message-body-only Project links and conflicting provider names fail closed to identity-only',async()=>{
  const segment=projectId+'-ambiguous-project';
  const cases=[
    '<main><div data-message-author-role="user"><a id="poison" href="/g/'+segment+'/project">PRIVATE PROJECT</a></div></main>',
    '<header><a href="/g/'+segment+'/project">Name A</a><a href="/g/'+segment+'/project">Name B</a></header>'
  ];
  for(const html of cases){
    const page=await fixture(html,'https://chatgpt.com/g/'+segment+'/c/'+chat);
    try{
      const poison=await page.$('#poison');
      if(poison)await page.evaluate(()=>Object.defineProperty(document.getElementById('poison'),'textContent',{
        get(){throw Error('message body must not be read');}
      }));
      const emitted=await observe(page);
      assert.equal(emitted.dtos.length,1);
      assert.equal(emitted.dtos[0].capability,'conversationIdentity');
    }finally{await page.close();}
  }
});


test('CPR-01 Project route waits for late Project-home evidence before settling',async()=>{
  const segment=projectId+'-late-project';
  const page=await fixture('<header id="project-header"></header>','https://chatgpt.com/g/'+segment+'/c/'+chat);
  try{
    const first=await observe(page);
    assert.equal(first,null,'Project route must not settle identity-only while strong evidence is incomplete');
    await page.evaluate(({segment})=>{
      const a=document.createElement('a');
      a.href='/g/'+segment+'/project';
      a.textContent='Late Project';
      document.getElementById('project-header').append(a);
    },{segment});
    const second=await observe(page);
    assert.equal(second.dtos.length,2);
    assert.equal(second.dtos.find(dto=>dto.capability==='membership').observation.projectName,'Late Project');
  }finally{await page.close();}
});

test('CPR-01 oversized Project names fail closed instead of truncating provider truth',async()=>{
  const segment=projectId+'-oversized-project';
  const longName='X'.repeat(301);
  const page=await fixture('<header><a id="project-home" href="/g/'+segment+'/project"></a></header>','https://chatgpt.com/g/'+segment+'/c/'+chat);
  try{
    await page.evaluate(name=>{document.getElementById('project-home').textContent=name;},longName);
    const emitted=await observe(page);
    assert.equal(emitted,null);
  }finally{await page.close();}
});
