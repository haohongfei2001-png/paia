import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,open,unlink,stat,realpath} from 'node:fs/promises';
import {resolve,join,extname,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {installPromptCloseBridge,readPromptGeometry} from './prompt-frame.mjs';

const home=dirname(fileURLToPath(import.meta.url)),args=process.argv.slice(2);
const arg=name=>{const i=args.indexOf(name);return i<0?null:args[i+1];};
const source=resolve(arg('--source')||''),expected=arg('--sha'),round=Number(arg('--round'));
const output=resolve(arg('--output')||join(home,'evidence'));
const plan=JSON.parse(await readFile(join(home,'scenes.json'),'utf8'));
const runtime=JSON.parse(await readFile(join(home,'runtime-binding.json'),'utf8'));
const blockedIds=['reading-copy-departure-before-read','reading-copy-departure-after-call'];
const executable=plan.scenes.filter(s=>s.execution==='ELIGIBLE');
const ownerNames=['contextRecovery','syncRecovery','archiveRecovery'];
const harnessFiles=['runner.mjs','prompt-frame.mjs','scenes.json','runtime-binding.json','copy-route-evidence.json','browser/bootstrap.mjs','browser/archive-thought.mjs','browser/prompt.mjs','browser/chrome-shim.js','browser/settings-gap.mjs','browser/gap-state.mjs','browser/gap-scenes.mjs','browser/context-recovery.mjs','browser/sync-recovery.mjs','browser/archive-recovery.mjs'];
const hash=value=>createHash('sha256').update(value).digest('hex');
const git=(...a)=>execFileSync('git',['-C',source,...a],{encoding:'utf8'}).trim();
function requireThat(ok,message){if(!ok)throw Error(message);}
requireThat(arg('--source')&&expected,'Required: --source <frozen worktree> --sha <exact HEAD>');
requireThat(git('rev-parse','HEAD')===expected,'Source HEAD does not equal the approved frozen SHA');
requireThat(!git('status','--porcelain','--','extension/ui','extension/content','extension/core','extension/background','extension/adapter','extension/icons','extension/manifest.json'),'Runtime source is dirty; freeze before launch');
requireThat(plan.scenes.length===10&&new Set(plan.scenes.map(s=>s.id)).size===10&&plan.authorization.maxCapturesPerRound===8&&plan.authorization.maxJobMinutesIncludingSetup===10&&executable.length===8,'Manifest must contain 10 distinct recovery states with exactly8 executable within ten minutes');
requireThat(JSON.stringify(plan.scenes.filter(s=>s.execution==='BLOCKED').map(s=>s.id).sort())===JSON.stringify([...blockedIds].sort()),'Only the two statically unreachable consumers may be predeclared NOT_RUN');
requireThat(plan.runtime.remoteHead===runtime.remoteHead&&runtime.remoteHead==='e99e7ac5aeea73f727acf707fc7f7e651fa2cf2f'&&runtime.pathCount===650&&Object.keys(runtime.files).length===650,'Exact current-source binding is required');
requireThat(git('show','-s','--format=%P','HEAD')==='d82086269a4fa134b089bdd944908b2eb30c4ad6','Evidence commit must have exactly one parent: original failed evidence commit');
for(const scene of plan.scenes)requireThat([390,1280].includes(scene.width)&&scene.height===(scene.width===390?844:900)&&['light','dark'].includes(scene.theme),'Viewport/theme scope changed');
for(const file of harnessFiles){await stat(join(home,file));if(/\.(?:mjs|js)$/.test(file))execFileSync(process.execPath,['--check',join(home,file)],{stdio:'pipe'});}
const tracked=git('ls-files','-z','extension/ui','extension/content','extension/core','extension/background','extension/adapter','extension/icons','extension/manifest.json').split('\0').filter(Boolean);
const files={};for(const name of tracked)files[name]=hash(await readFile(join(source,name)));
requireThat(tracked.length===650&&Object.keys(files).every(name=>files[name]===runtime.files[name]),'Runtime differs from the bound 650-file published source');
const binding={head:expected,files,manifestSHA256:hash(await readFile(join(home,'scenes.json'))),harness:{}};
for(const name of harnessFiles)binding.harness[name]=hash(await readFile(join(home,name)));
binding.runtimeBase=runtime.remoteHead;binding.runtimeBaseTree=runtime.tree;
const originalArchive=await readFile(join(source,'extension/ui/archive.js'));
for(const name of ['navigate','render','refresh','appendDocumentPage','paintInputTimeOrder'])requireThat(new RegExp('(?:function\\s+'+name+'\\b|(?:const|let)\\s+'+name+'\\s*=)').test(originalArchive.toString()),'Missing actual source bridge function '+name);
const require=createRequire(join(source,'extension/package.json'));
const playwrightModule=require.resolve(process.env.PLAYWRIGHT_MODULE||'playwright'),{chromium}=require(playwrightModule);
let executablePath=process.env.CHROME_PATH;
if(!executablePath)for(const candidate of [chromium.executablePath(),'/usr/bin/chromium','/usr/bin/chromium-browser']){try{await stat(candidate);executablePath=candidate;break;}catch{}}
requireThat(executablePath,'No already installed Chromium executable; no installation allowed');await stat(executablePath);
binding.environment={playwrightModule,executablePath,node:process.version};
if(args.includes('--preflight')){console.log(JSON.stringify({status:'SOURCE_PREFLIGHT_ONLY',head:expected,scenes:10,executableStates:8,predeclaredBlocked:blockedIds,sourceFiles:tracked.length,playwrightModule,executablePath,browserLaunched:false}));process.exit(0);}
requireThat(round===1,'This separately approved cloud job has exactly one attempt; no round2 or retry');
requireThat(args.includes('--execute-approved'),'Execution requires explicit --execute-approved from the coordinating parent');
requireThat(process.env.PAIA_VISUAL_SCOPE==='ui-recovery8-20261029'&&process.env.GITHUB_RUN_ATTEMPT==='1'&&process.env.GITHUB_EVENT_NAME==='create'&&process.env.GITHUB_REF==='refs/heads/evidence/ui-recovery8-20261029'&&process.env.GITHUB_SHA===expected,'Only the exact one-off branch creation attempt is admitted');
await mkdir(output,{recursive:true});
const lockPath=join(output,'session.lock');
let browser,server,timer,fatal=null;
const sessionPath=join(output,'session.json');let session={rounds:[],elapsedMs:0};
try{session=JSON.parse(await readFile(sessionPath,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
requireThat(session.rounds.length===0,'The one-off cloud attempt has already started; no retry');
requireThat(session.elapsedMs===0,'This one-off job cannot reuse an earlier visual session');
const lock=await open(lockPath,'wx');
const started=Date.now(),jobDeadline=Number(process.env.PAIA_VISUAL_CAPTURE_DEADLINE_MS);
requireThat(Number.isFinite(jobDeadline)&&jobDeadline>started+15000,'No bounded job time remains for a capture attempt');
const budget=Math.min(360000,jobDeadline-started),directory=join(output,`round-${round}`);
await mkdir(directory,{recursive:true});
const record={round,head:expected,runtimeBase:runtime.remoteHead,startedAt:new Date().toISOString(),status:'RUNNING',captures:[],failedCapture:null,blocked:plan.scenes.filter(s=>s.execution==='BLOCKED').map(s=>({id:s.id,status:'BLOCKED_NOT_RUN',reason:s.blockedReason,evidence:s.blockedEvidence})),notRun:plan.scenes.map(s=>s.id),elapsedMs:0};
let pngBytes=0;
const maxPNGBytes=48*1024*1024,maxLedgerBytes=6*1024*1024;
const boundedJSON=async(path,value,max)=>{const bytes=Buffer.from(JSON.stringify(value,null,2));requireThat(bytes.length<=max,'METADATA_ARTIFACT_BOUND');await writeFile(path,bytes);};
session.rounds.push(record);
const save=async()=>{await boundedJSON(join(directory,'ledger.json'),record,maxLedgerBytes);await boundedJSON(sessionPath,session,maxLedgerBytes);};
await boundedJSON(join(directory,'source-binding.json'),binding,1024*1024);await boundedJSON(join(directory,'scene-manifest.json'),plan,256*1024);await boundedJSON(join(directory,'copy-route-evidence.json'),JSON.parse(await readFile(join(home,'copy-route-evidence.json'),'utf8')),64*1024);await save();
const bridge=`\n// Harness-only exports; the preceding production bytes are unchanged.\nglobalThis.__paiaVisualOwners={navigate,render,refresh,appendDocumentPage,paintInputTimeOrder,appShell,thoughts,contextCards,archiveNavigator,topicActions,getState:()=>state,get state(){return state},get view(){return view},get documentId(){return documentId},get query(){return query},get editor(){return editor},get readerStream(){return readerStream},get readingSnapshot(){return readingSnapshot},get inputSortSnapshot(){return inputSortSnapshot},get annualReading(){return annualReading}};\n`;
const transforms=[];
const sourceRoot=await realpath(join(source,'extension')),harnessRoot=await realpath(home);
const allowedSource=new Set(tracked.map(name=>'/'+name.slice('extension/'.length)));
let activeScene=null,activePage=null,activeRequests=[],activeAction=null,activeTranscript=[],activeObservations=[],activeDialogs=[],activeActions=[];
const allowedHarness=new Set(harnessFiles.filter(name=>name.startsWith('browser/')));
try{
 const original=await readFile(join(source,'extension/ui/archive.js'));
 // Refuse stale export names before spending an approved browser round.
 for(const name of ['navigate','render','refresh','appendDocumentPage','paintInputTimeOrder'])requireThat(new RegExp('(?:function\\s+'+name+'\\b|(?:const|let)\\s+'+name+'\\s*=)').test(original.toString()),'Missing actual source bridge function '+name);
 server=createServer(async(req,res)=>{
  try{
   const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
   if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
   const root=pathname.startsWith('/_visual/')?home:join(source,'extension');
   const relative=pathname.startsWith('/_visual/')?pathname.slice('/_visual/'.length):pathname.slice(1);
   requireThat(req.method==='GET'||req.method==='HEAD','Only local source reads are permitted');
   requireThat(pathname.startsWith('/_visual/')?allowedHarness.has(relative):allowedSource.has(pathname),'Path is outside frozen source/harness whitelist');
   const path=await realpath(resolve(root,relative));requireThat(path.startsWith((pathname.startsWith('/_visual/')?harnessRoot:sourceRoot)+sep),'Path or symlink escaped served source');
   let body=await readFile(path);requireThat(hash(body)===(pathname.startsWith('/_visual/')?binding.harness[relative]:binding.files['extension'+pathname]),'Frozen source/harness bytes changed');
   if(pathname==='/ui/archive.html'){
    const before=body;body=Buffer.from(body.toString().replace('<script type="module" src="archive.js"></script>','<script type="module" src="/_visual/browser/bootstrap.mjs"></script>'));
    requireThat(!body.equals(before),'Original archive entry tag changed; refusing unbound bootstrap');
    transforms.push({path:pathname,kind:'replace-only-script-entry',originalSHA256:hash(before),servedSHA256:hash(body)});
   }
   if(pathname==='/ui/archive.js'){const before=body;body=Buffer.concat([before,Buffer.from(bridge)]);transforms.push({path:pathname,kind:'append-owner-accessors',originalSHA256:hash(before),servedSHA256:hash(body),originalPrefixUnchanged:true});}
   const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'}[extname(path)]||'application/octet-stream';
   res.writeHead(200,{'content-type':mime,'cache-control':'no-store','content-security-policy':"default-src 'self' data: blob:; connect-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-src 'self'; font-src 'self' data:; img-src 'self' data: blob:; object-src 'none'; base-uri 'none'; form-action 'none'"});res.end(body);
  }catch(error){res.writeHead(404);res.end('Unavailable source path');fatal??='HTTP_SOURCE_FAILURE: '+error.message;}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 timer=setTimeout(()=>{fatal??='ROUND_TIME_BUDGET_EXCEEDED';void browser?.close().catch(()=>{});},budget);
 browser=await chromium.launch({headless:true,executablePath,args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']});
 const shim=await readFile(join(home,'browser/chrome-shim.js'),'utf8');
 for(const scene of executable){
  requireThat(!fatal,fatal||'round stopped');requireThat(Date.now()-started<budget,'Round time budget exhausted');
  const context=await browser.newContext({viewport:{width:scene.width,height:scene.height},colorScheme:scene.theme,locale:'zh-CN',serviceWorkers:'block',acceptDownloads:false});
  activeScene=scene;activeAction='create-context';activeTranscript=[];activeObservations=[];activeDialogs=[];activeActions=[];
  const requests=[];activeRequests=requests;await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!==base){fatal='NONLOOPBACK_REQUEST_BLOCKED: '+u.origin;requests.push({url:route.request().url(),blocked:true});return route.abort('blockedbyclient');}if(requests.length>=2000){fatal??='SCENE_REQUEST_BOUND';return route.abort('blockedbyclient');}requests.push({url:u.pathname,blocked:false});return route.continue();});
  await context.addInitScript({content:`globalThis.__PAIA_VISUAL_CONFIG=${JSON.stringify({scene,base,version:JSON.parse(await readFile(join(source,'extension/manifest.json'),'utf8')).version})};\n${shim}`});
  const page=await context.newPage();activePage=page;await installPromptCloseBridge(page,base,scene,activeTranscript);page.setDefaultTimeout(7000);page.setDefaultNavigationTimeout(20000);
  page.on('pageerror',error=>{fatal??='PAGE_SCRIPT_FAILURE: '+error.message;});
  page.on('dialog',async dialog=>{
   const declared=activeAction?.dialog,event={type:dialog.type(),message:dialog.message(),accepted:false};activeDialogs.push(event);
   if(!declared||event.type!==declared.type||!event.message.includes(declared.messageIncludes)){fatal??='UNDECLARED_NATIVE_DIALOG';await dialog.dismiss();return;}
   event.accepted=declared.accept===true;if(event.accepted)await dialog.accept();else await dialog.dismiss();
  });
  activeAction='navigate';await page.goto(base+'/ui/archive.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>globalThis.__paiaVisualResult||globalThis.__paiaVisualFatal);
  const result=await page.evaluate(()=>({result:globalThis.__paiaVisualResult,fatal:globalThis.__paiaVisualFatal}));
  requireThat(!fatal&&!result.fatal,fatal||result.fatal);
  requireThat(result.result?.status==='READY','SCENE_NOT_READY: '+scene.id+' '+JSON.stringify(result.result));
  const target=async spec=>{
   if(!spec.frameURL)return page.locator(spec.selector);
   const until=Date.now()+7000;let frame;
   while(!(frame=page.frames().find(f=>{try{return new URL(f.url()).pathname===spec.frameURL;}catch{return false;}}))){requireThat(Date.now()<until,'Source iframe not ready: '+spec.frameURL);await new Promise(r=>setTimeout(r,25));}
   return frame.locator(spec.selector);
  };
  const poll=async(check,label)=>{const until=Date.now()+7000;while(!await check()){requireThat(!fatal,fatal||'round stopped');const pageFatal=await page.evaluate(()=>globalThis.__paiaVisualFatal||null);requireThat(!pageFatal,pageFatal);requireThat(Date.now()<until,'ACTION_ASSERTION_FAILED: '+label);await new Promise(r=>setTimeout(r,25));}};
  let cdp=null;
  for(const action of result.result.actions||[]){
   activeAction=action;requireThat(!fatal,fatal||'round stopped');const priorFatal=await page.evaluate(()=>globalThis.__paiaVisualFatal||null);requireThat(!priorFatal,priorFatal);requireThat(activeActions.length<200,'SCENE_ACTION_BOUND');activeActions.push({action,startedAt:Date.now()});
   if(action.action==='fixtureControl'){
    requireThat(ownerNames.includes(action.owner)&&typeof action.command==='string'&&action.command.length<=80,'FIXTURE_CONTROL_SCOPE');
    const outcome=await page.evaluate(({owner,command})=>globalThis.__paiaRecoveryControl(owner,command),action);requireThat(outcome?.handled===true,'RECOVERY_CONTROL_NOT_HANDLED');continue;
   }
   if(action.action==='assertRecovery'){
    requireThat(ownerNames.includes(action.owner)&&Array.isArray(action.path)&&action.path.length<=10,'RECOVERY_OBSERVATION_SCOPE');
    await poll(()=>page.evaluate(({owner,path,value})=>{let actual=globalThis.__paiaRecoveryEvidence(owner);for(const part of path)actual=actual?.[part];return JSON.stringify(actual)===JSON.stringify(value);},action),JSON.stringify(action));continue;
   }
   if(action.action==='assertState'){
    await poll(()=>page.evaluate(({path,value})=>{const state=globalThis.__paiaGapStateEvidence?.();let actual=state;for(const part of path)actual=actual?.[part];return JSON.stringify(actual)===JSON.stringify(value);},{path:action.path,value:action.value}),JSON.stringify(action));continue;
   }
   const node=await target(action);
   if(action.action==='wait')await node.waitFor({state:action.state||'visible'});
   else if(action.action==='doubleClick'||(action.action==='click'&&action.clickCount===2))await node.dblclick();
   else if(action.action==='click')await node.click();
   else if(action.action==='fill')await node.fill(action.value);
   else if(action.action==='press')await node.press(action.key||action.value);
   else if(action.action==='focus')await node.focus();
   else if(action.action==='select')await node.selectOption(action.value);
   else if(action.action==='assertCount')await poll(async()=>await node.count()===action.value,JSON.stringify(action));
   else if(action.action==='assert')await poll(async()=>{
    if(await node.count()!==1)return false;
    return node.evaluate((el,a)=>{
     if(a.assertion==='focused')return el.ownerDocument.activeElement===el;
     if(a.assertion==='unchecked')return el.checked===false;
     if(a.assertion==='attribute')return el.getAttribute(a.name)===a.value;
     if(a.assertion==='value')return el.value===a.value;
     if(a.assertion==='text')return el.textContent===a.value;
     throw Error('UNKNOWN_READONLY_ASSERTION');
    },action);
   },JSON.stringify(action));
   else if(action.action==='ime'){
    requireThat(['nib-keyboard-ime-dirty-dark','context-conflict-replacement-preserved'].includes(scene.id)&&typeof action.value==='string'&&action.value.length<=2,'IME_ACTION_SCOPE');await node.focus();cdp??=await context.newCDPSession(page);await cdp.send('Input.imeSetComposition',{text:action.value,selectionStart:action.value.length,selectionEnd:action.value.length});
   }
   else if(action.action==='observe'){
    requireThat(scene.id==='nib-keyboard-ime-dirty-dark','OBSERVATION_SCOPE');activeObservations.push({label:action.label,geometry:await readPromptGeometry(page,base)});
   }else throw Error('Unsupported trusted action');
   const actionFatal=await page.evaluate(()=>globalThis.__paiaVisualFatal||null);requireThat(!actionFatal,actionFatal);
  }

  const sceneFatal=await page.evaluate(()=>globalThis.__paiaVisualFatal||null);requireThat(!sceneFatal,sceneFatal);
  activeAction={action:'ready',selector:result.result.readySelector};
  if(result.result.readySelector){const spec=typeof result.result.readySelector==='string'?{selector:result.result.readySelector}:result.result.readySelector;await (await target(spec)).first().waitFor({state:'visible'});}
  await page.mouse.move(0,0);
  if(scene.group==='prompt')for(const frame of page.frames()){if(frame.url().includes('/ui/prompt-surface.html'))await frame.waitForFunction(()=>!document.documentElement.hasAttribute('data-layout-pending'));}
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  requireThat(!fatal,fatal||'round stopped');
  const evidence=await page.evaluate(()=>({fatal:globalThis.__paiaVisualFatal,rpc:globalThis.__paiaVisualRPCLog,fixture:globalThis.__paiaVisualFixtureLimits,page:{width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,focused:{tag:document.activeElement?.tagName,id:document.activeElement?.id,label:document.activeElement?.getAttribute('aria-label')},openDialogs:[...document.querySelectorAll('dialog[open]')].map(e=>({id:e.id,label:e.getAttribute('aria-label')}))},owners:globalThis.__paiaVisualResult?.evidence,gapState:globalThis.__paiaGapStateEvidence?.(),recovery:Object.fromEntries(['contextRecovery','syncRecovery','archiveRecovery'].map(owner=>[owner,globalThis.__paiaRecoveryEvidence?.(owner)]))}));
  if(scene.group==='prompt')evidence.promptGeometry=await readPromptGeometry(page,base);
  evidence.actions=activeActions;evidence.promptCloseTranscript=activeTranscript;evidence.observations=activeObservations;evidence.nativeDialogs=activeDialogs;
  const bounds=evidence.gapState?.bounds;
  requireThat(bounds&&bounds.topics<=8&&bounds.sections.every(n=>n<=2)&&bounds.inputs<=12&&bounds.entries<=12&&bounds.contextItems<=3&&evidence.gapState.drafts.length<=4,'FINAL_SYNTHETIC_DATA_BOUND');
  const recovery=Object.values(evidence.recovery).filter(Boolean);
  for(const owner of recovery){requireThat(owner.providerCalls===0&&owner.realAccounts===0&&owner.grantChanges===0,'RECOVERY_NO_EXTERNAL_AUTHORITY');if(owner.bounds){requireThat((owner.bounds.contextItems??0)+bounds.contextItems<=3&&(owner.bounds.drafts??0)+evidence.gapState.drafts.length<=4,'RECOVERY_COMBINED_DATA_BOUND');}}
  requireThat(recovery.every(o=>Number.isInteger(o.adapterContentMutations)&&o.adapterContentMutations>=0),'RECOVERY_MUTATION_ACCOUNTING_REQUIRED');
  evidence.effectiveBounds={...bounds,contextItems:bounds.contextItems+recovery.reduce((n,o)=>n+(o.bounds?.contextItems??0),0),drafts:evidence.gapState.drafts.length+recovery.reduce((n,o)=>n+(o.bounds?.drafts??0),0),mutations:evidence.gapState.writes.length+evidence.gapState.created.length+recovery.reduce((n,o)=>n+o.adapterContentMutations,0)};
  requireThat(evidence.effectiveBounds.mutations<=2&&evidence.effectiveBounds.contextItems<=3&&evidence.effectiveBounds.drafts<=4,'COMBINED_SYNTHETIC_DATA_BOUND');
  requireThat(evidence.gapState.providerCalls===0&&evidence.gapState.realAccounts===0&&evidence.gapState.externalAllowed===false,'FINAL_NO_EXTERNAL_AUTHORITY');
  if(scene.group==='prompt'){
   requireThat(!(evidence.rpc||[]).some(r=>['close','PAIA_PROMPT_CREATE','PAIA_PROMPT_EDIT'].includes(r.command)),'UNEXPECTED_PROMPT_WRITE_OR_CLOSE');
   const insertRequests=(evidence.rpc||[]).filter(r=>r.command==='PAIA_PROMPT_SELECTION_INSERT'),expectsRefusal=['nib-long-notice','nib-long-notice-narrow','nib-copy-failure'].includes(scene.id);
   requireThat(expectsRefusal?insertRequests.length===1&&insertRequests[0].handled===true&&insertRequests[0].expectedFailure==='UNAVAILABLE'&&insertRequests[0].boundary==='synthetic_no_receiver':insertRequests.length===0,'INSERT_MUST_BE_REFUSED_WITHOUT_RECEIVER');
   if(scene.id==='nib-copy-failure')requireThat(evidence.promptGeometry.clipboardDenied?.attempted===true,'CLIPBOARD_REFUSAL_NOT_REACHED');
   if(scene.id==='nib-keyboard-ime-dirty-dark')requireThat(evidence.promptGeometry.editor.visible&&evidence.promptGeometry.editor.text?.startsWith('合成输入 01')&&evidence.promptGeometry.inputEvents.some(e=>e.type==='compositionstart'&&e.trusted)&&evidence.promptGeometry.inputEvents.some(e=>e.type==='keydown'&&e.key==='Escape'&&e.trusted),'NATIVE_COMPOSITION_OR_DIRTY_GUARD_NOT_OBSERVED');
  }
  requireThat(!evidence.fatal,evidence.fatal);requireThat(record.captures.length<8,'Capture ceiling exceeded');
  const filename=scene.id+'.png',png=await page.screenshot({animations:'disabled',timeout:Math.min(7000,Math.max(1,started+budget-Date.now()))});
  requireThat(pngBytes+png.length<=maxPNGBytes,'PNG_ARTIFACT_BOUND');
  const captured={scene,...evidence,requests,file:filename,sha256:hash(png),status:'CAPTURED_NOT_VISUALLY_ACCEPTED'};
  requireThat(Buffer.byteLength(JSON.stringify({...record,captures:[...record.captures,captured]}))<maxLedgerBytes-65536,'SCENE_LEDGER_BOUND');
  await writeFile(join(directory,filename),png);pngBytes+=png.length;record.captures.push(captured);record.notRun=record.notRun.filter(id=>id!==scene.id);await save();
  console.log(JSON.stringify({event:'CAPTURED',round,scene:scene.id,file:join(directory,filename),count:record.captures.length,status:'CAPTURED_NOT_VISUALLY_ACCEPTED'}));await context.close();activePage=null;activeScene=null;activeAction=null;
 }
 record.status='EXECUTABLE_CAPTURE_COMPLETE_WITH_2_BLOCKED_PENDING_PIXEL_REVIEW';
}catch(error){
 record.status='STOPPED_NO_AUTOMATIC_RETRY';record.error=fatal||error.stack||String(error);process.exitCode=1;
 // Retain the original failed action and RPC transcript before closing the page.
 // Diagnostics never alter source UI or manufacture a successful scene/capture.
 const failure={scene:activeScene,action:activeAction,actions:activeActions,requests:activeRequests,promptCloseTranscript:activeTranscript,observations:activeObservations,nativeDialogs:activeDialogs,originalError:record.error};
 if(activePage&&!activePage.isClosed())try{
  failure.page=await activePage.evaluate(()=>({fatal:globalThis.__paiaVisualFatal,rpc:globalThis.__paiaVisualRPCLog,fixture:globalThis.__paiaVisualFixtureLimits,ready:globalThis.__paiaVisualResult?.status,dom:document.body?.innerText?.slice(0,24000),controls:[...document.querySelectorAll('button,input,textarea,select,[role=button]')].slice(0,120).map(e=>({tag:e.tagName,id:e.id,role:e.getAttribute('role'),label:e.getAttribute('aria-label'),text:e.textContent?.slice(0,160),disabled:e.disabled,hidden:e.hidden})),gapState:globalThis.__paiaGapStateEvidence?.(),recovery:Object.fromEntries(['contextRecovery','syncRecovery','archiveRecovery'].map(owner=>[owner,globalThis.__paiaRecoveryEvidence?.(owner)]))}));
  if(activeScene?.group==='prompt')try{failure.promptGeometry=await readPromptGeometry(activePage,new URL(activePage.url()).origin);}catch(diagnosticError){failure.promptGeometryError=String(diagnosticError);}
 }catch(diagnosticError){failure.diagnosticError=String(diagnosticError);}
 // A diagnostic screenshot is counted against8 and shares the PNG byte budget.
 if(activePage&&!activePage.isClosed()&&record.captures.length<8&&Date.now()<started+budget)try{
  const png=await activePage.screenshot({animations:'disabled',timeout:Math.min(2000,Math.max(1,started+budget-Date.now()))});
  if(pngBytes+png.length<=maxPNGBytes){const file='FAILED-'+(activeScene?.id||'setup')+'.png';await writeFile(join(directory,file),png);pngBytes+=png.length;record.failedCapture={file,sha256:hash(png),status:'FAILURE_DIAGNOSTIC_NOT_ACCEPTED'};}else failure.screenshotError='PNG_ARTIFACT_BOUND';
 }catch(diagnosticError){failure.screenshotError=String(diagnosticError);}
 try{await boundedJSON(join(directory,'failed-scene.json'),failure,1024*1024);}catch(diagnosticError){await boundedJSON(join(directory,'failed-scene.json'),{scene:activeScene?.id,originalError:record.error,diagnosticError:String(diagnosticError)},65536);}
}
finally{
 clearTimeout(timer);await browser?.close().catch(()=>{});if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r));}
 record.elapsedMs=Date.now()-started;session.elapsedMs+=record.elapsedMs;record.finishedAt=new Date().toISOString();
 await boundedJSON(join(directory,'served-transformations.json'),transforms,512*1024);record.pngBytes=pngBytes;record.pngCount=record.captures.length+(record.failedCapture?1:0);await save();await lock.close();await unlink(lockPath);
 console.log(JSON.stringify({round,status:record.status,captures:record.captures.length,notRun:record.notRun,elapsedMs:record.elapsedMs,error:record.error||null}));
}
