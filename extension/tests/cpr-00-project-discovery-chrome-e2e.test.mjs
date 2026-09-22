import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {summarizeDiscovery} from '../development/cpr00-project-probe/probe-core.js';

const require=createRequire(import.meta.url);
let playwright;
if(process.env.PLAYWRIGHT_MODULE)playwright=require(process.env.PLAYWRIGHT_MODULE);
else{try{playwright=require('playwright');}catch{playwright=require('/Users/hhf/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');}}
const {chromium}=playwright;
const adapterSource=await readFile(new URL('../adapter/chatgpt-adapter.js',import.meta.url),'utf8');
const schemaSource=await readFile(new URL('../core/diagnostics-schema.js',import.meta.url),'utf8');
const contractSource=await readFile(new URL('../adapter/source-structure-contract.js',import.meta.url),'utf8');
const sourceStructureSource=await readFile(new URL('../adapter/chatgpt-source-structure.js',import.meta.url),'utf8');
const bridgeSource=await readFile(new URL('../content/source-structure-bridge.js',import.meta.url),'utf8');
const commandSource=await readFile(new URL('../development/CPR-00 Project Discovery.command',import.meta.url),'utf8');
const gateSource=await readFile(new URL('../development/cpr00-project-probe/gate.js',import.meta.url),'utf8');
let browser;

before(async()=>{browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined),args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-default-browser-check']});});
after(async()=>{await browser?.close();});

async function fixture(html,url){
 const page=await browser.newPage();
 const body='<!doctype html><html><head><style>header,nav,main,a{display:block;min-height:4px}</style></head><body>'+html+'</body></html>';
 await page.route('**/*',route=>{
  if(route.request().isNavigationRequest()&&route.request().url().startsWith('https://chatgpt.com/')){
   void route.fulfill({status:200,contentType:'text/html',body});
   return;
  }
  void route.abort();
 });
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.addScriptTag({content:schemaSource});await page.addScriptTag({content:adapterSource});
 await page.addScriptTag({content:contractSource});await page.addScriptTag({content:sourceStructureSource});
 await page.evaluate(()=>{
  window.syntheticLocation={href:location.href};
  window.chrome={runtime:{
   id:'synthetic-cpr00-extension',
   getURL:path=>'chrome-extension://synthetic-cpr00-extension'+path,
   onMessage:{addListener(){}},
   sendMessage:async request=>request?.type==='GET_STATUS'
    ?{ok:true,data:{consented:false,enabled:false,adapterVersion:'0.3.0',epoch:0}}
    :{ok:false,error:'FORBIDDEN'}
  }};
 });
 await page.addScriptTag({content:bridgeSource});
 return page;
}
const pid='g-p-'+'a'.repeat(32),chat='chat-fixture-001',salt='1'.repeat(32);

test('CPR-00 probe binds g-p project route to same-project visible name without raw emission',async()=>{
 const segment=pid+'-private-project-name';
 const page=await fixture('<header><a href="/g/'+segment+'/project">Private Project Name</a></header><main></main>','https://chatgpt.com/g/'+segment+'/c/'+chat);
 try{
  const result=await page.evaluate(s=>window.PAIAProjectDiscoveryProbe.scan({salt:s,href:window.syntheticLocation.href}),salt);
  assert.equal(result.route.kind,'project_chat');assert.match(result.route.projectDigest,/^[a-f0-9]{32}$/);
  assert.equal(result.counts.matchingRouteProjectAnchors,1);assert.equal(result.counts.namedMatchingRouteAnchors,1);
  assert.equal(result.anchors[0].matchesRouteProject,true);assert.match(result.anchors[0].labelDigest,/^[a-f0-9]{32}$/);
  const json=JSON.stringify(result);
  for(const secret of [pid,'private-project-name','Private Project Name',chat,'https://chatgpt.com'])assert.equal(json.includes(secret),false,secret);
  assert.deepEqual(result.privacy,{messageBodiesRead:false,assistantBodiesRead:false,draftsRead:false,rawProjectIdsEmitted:false,rawProjectNamesEmitted:false,urlsEmitted:false});
 }finally{await page.close();}
});

test('CPR-00 probe does not confuse custom GPT or ordinary chat with Project membership',async()=>{
 const projectSegment=pid+'-visible-sidebar-project';
 for(const [url,kind] of [
  ['https://chatgpt.com/g/g-custom-gpt-fixture/c/'+chat,'g_other_chat'],
  ['https://chatgpt.com/c/'+chat,'plain_chat']
 ]){
  const page=await fixture('<nav><a href="/g/'+projectSegment+'/project">Sidebar Project</a></nav><main></main>',url);
  try{
   const result=await page.evaluate(s=>window.PAIAProjectDiscoveryProbe.scan({salt:s,href:window.syntheticLocation.href}),salt);
   assert.equal(result.route.kind,kind);assert.equal(result.route.projectDigest,null);
   assert.equal(result.anchors.some(item=>item.matchesRouteProject),false);
  }finally{await page.close();}
 }
});

test('CPR-00 probe excludes fake Project links inside user messages before reading their labels',async()=>{
 const segment=pid+'-real-project';
 const page=await fixture('<header><a href="/g/'+segment+'/project">Real Project</a></header><main><div data-message-author-role="user"><a id="poison" href="/g/'+pid+'-fake/project">FAKE PRIVATE BODY PROJECT</a></div></main>','https://chatgpt.com/g/'+segment+'/c/'+chat);
 try{
  await page.evaluate(()=>Object.defineProperty(document.getElementById('poison'),'textContent',{get(){throw Error('forbidden body read');}}));
  const result=await page.evaluate(s=>window.PAIAProjectDiscoveryProbe.scan({salt:s,href:window.syntheticLocation.href}),salt);
  assert.equal(result.counts.projectAnchors,1);
  assert.equal(JSON.stringify(result).includes('FAKE PRIVATE BODY PROJECT'),false);
 }finally{await page.close();}
});

test('CPR-00 never treats a current conversation title as the Project name',async()=>{
 const segment=pid+'-private-project';
 const page=await fixture('<nav><a href="/g/'+segment+'/c/'+chat+'">Private Conversation Title</a></nav><main></main>','https://chatgpt.com/g/'+segment+'/c/'+chat);
 try{
  const result=await page.evaluate(s=>window.PAIAProjectDiscoveryProbe.scan({salt:s,href:window.syntheticLocation.href}),salt);
  assert.equal(result.counts.matchingRouteProjectAnchors,1);
  assert.equal(result.counts.namedMatchingRouteAnchors,0);
  const report=summarizeDiscovery({runtime,captures:{project:result,projectReload:result,ordinary:snap('plain_chat'),projectReturn:result}});
  assert.equal(report.contractCandidateReady,false);
  assert.ok(report.reasons.includes('projectNameCandidate'));
 }finally{await page.close();}
});

test('CPR-00 run-local digests are stable inside one run and unlinkable across salts',async()=>{
 const segment=pid+'-stable-name';
 const page=await fixture('<header><a href="/g/'+segment+'/project">Stable Name</a></header><main></main>','https://chatgpt.com/g/'+segment+'/c/'+chat);
 try{
  const [a,b,c]=await page.evaluate(async()=>[
   await window.PAIAProjectDiscoveryProbe.scan({salt:'2'.repeat(32),href:window.syntheticLocation.href}),
   await window.PAIAProjectDiscoveryProbe.scan({salt:'2'.repeat(32),href:window.syntheticLocation.href}),
   await window.PAIAProjectDiscoveryProbe.scan({salt:'3'.repeat(32),href:window.syntheticLocation.href})
  ]);
  assert.equal(a.route.projectDigest,b.route.projectDigest);assert.equal(a.anchors[0].labelDigest,b.anchors[0].labelDigest);
  assert.notEqual(a.route.projectDigest,c.route.projectDigest);assert.notEqual(a.anchors[0].labelDigest,c.anchors[0].labelDigest);
 }finally{await page.close();}
});

const snap=(kind='project_chat',projectDigest='p'.repeat(32),nameDigest='n'.repeat(32),conversationDigest='c'.repeat(32),pageInstanceDigest='i'.repeat(32))=>({
 schemaVersion:1,code:'OK',route:{kind,projectDigest:kind==='plain_chat'?null:projectDigest,conversationDigest},
 pageInstanceDigest,
 anchors:kind==='plain_chat'?[]:[{kind:'project_home',zone:'header',visible:true,projectDigest,labelDigest:nameDigest,labelLength:7,matchesRouteProject:true,currentConversation:false,selected:false}],
 nestedMemberships:[],attributes:[],counts:{projectAnchors:kind==='plain_chat'?0:1,matchingRouteProjectAnchors:kind==='plain_chat'?0:1,namedMatchingRouteAnchors:kind==='plain_chat'?0:1,currentConversationLinks:0,nestedMemberships:0,projectAttributes:0},
 privacy:{messageBodiesRead:false,assistantBodiesRead:false,draftsRead:false,rawProjectIdsEmitted:false,rawProjectNamesEmitted:false,urlsEmitted:false}
});
const runtime={sourceHead:'a'.repeat(40),runtimeParity:true,manifestVersion:'0.12.0',releaseDigest:'b'.repeat(64)};

test('CPR-00 summary requires project, reload, ordinary negative and away/back stability',()=>{
 const captures={
  project:snap('project_chat','p'.repeat(32),'n'.repeat(32),'c'.repeat(32),'1'.repeat(32)),
  projectReload:snap('project_chat','p'.repeat(32),'n'.repeat(32),'c'.repeat(32),'2'.repeat(32)),
  ordinary:snap('plain_chat','p'.repeat(32),'n'.repeat(32),'o'.repeat(32),'3'.repeat(32)),
  projectReturn:snap('project_chat','p'.repeat(32),'n'.repeat(32),'c'.repeat(32),'4'.repeat(32))
 };
 const report=summarizeDiscovery({runtime,captures});
 assert.equal(report.contractCandidateReady,true);assert.deepEqual(report.reasons,[]);
 assert.equal(report.candidate.channel,'route_plus_matching_project_home_link');
 assert.equal(report.checks.ordinaryNegative,true);
 assert.equal(report.checks.reloadSameConversation,true);
 assert.equal(report.checks.reloadNewDocument,true);
 assert.equal(report.checks.returnSameConversation,true);
});

test('CPR-00 summary rejects a fake reload that reuses the same document instance',()=>{
 const project=snap('project_chat','p'.repeat(32),'n'.repeat(32),'c'.repeat(32),'1'.repeat(32));
 const captures={project,projectReload:structuredClone(project),ordinary:snap('plain_chat','p'.repeat(32),'n'.repeat(32),'o'.repeat(32),'3'.repeat(32)),projectReturn:snap('project_chat','p'.repeat(32),'n'.repeat(32),'c'.repeat(32),'4'.repeat(32))};
 const report=summarizeDiscovery({runtime,captures});
 assert.equal(report.contractCandidateReady,false);
 assert.equal(report.checks.reloadNewDocument,false);
});

test('CPR-00 summary fails closed if ordinary chat carries a membership signal or runtime is stale',()=>{
 const ordinary=snap('plain_chat');
 ordinary.nestedMemberships=[{distance:2,projectDigest:'x'.repeat(32),labelDigest:'y'.repeat(32),labelLength:4,visible:true}];
 ordinary.counts.nestedMemberships=1;
 const captures={project:snap(),projectReload:snap(),ordinary,projectReturn:snap()};
 assert.equal(summarizeDiscovery({runtime,captures}).contractCandidateReady,false);
 assert.equal(summarizeDiscovery({runtime:{...runtime,runtimeParity:false},captures:{...captures,ordinary:snap('plain_chat')}}).contractCandidateReady,false);
});

test('CPR-00 helper locks reload, ordinary and return observations to the first Project tab',()=>{
 assert.match(gateSource,/let lockedProjectTabId=null/);
 assert.match(gateSource,/lockedProjectTabId=eligible\[0\]\.tabId/);
 assert.match(gateSource,/LOCKED_PROJECT_TAB_NOT_RESPONDING/);
 assert.match(gateSource,/RELOAD_NOT_FRESH_DOCUMENT/);
 assert.match(gateSource,/ORDINARY_MUST_USE_LOCKED_TAB/);
 assert.match(gateSource,/RETURN_WRONG_CONVERSATION/);
 assert.match(gateSource,/captures\[label\]=snapshot/);
 assert.doesNotMatch(gateSource,/captures\[label\]\s*=\s*\{[^}]*tabId/);
});

test('CPR-00 helper is development-only, read-only and the content bridge restricts the probe caller',()=>{
 assert.match(bridgeSource,/CPR00_PROJECT_PROBE/);assert.match(bridgeSource,/__paia_cpr00_project_probe\/index\.html/);
 assert.doesNotMatch(bridgeSource,/projectIdentity:'verified'|projectName:'verified'|membership:'verified'/);
 assert.match(commandSource,/build_current_release\.py/);assert.match(commandSource,/runtimeParity/);
 assert.doesNotMatch(commandSource,/chrome\.runtime\.reload|rsync -a --delete "\$RELEASE\/" "\$RUNTIME\/"/);
});
