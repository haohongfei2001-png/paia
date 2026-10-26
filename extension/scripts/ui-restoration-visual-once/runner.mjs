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
const hash=value=>createHash('sha256').update(value).digest('hex');
const git=(...a)=>execFileSync('git',['-C',source,...a],{encoding:'utf8'}).trim();
function requireThat(ok,message){if(!ok)throw Error(message);}
requireThat(arg('--source')&&expected,'Required: --source <frozen worktree> --sha <exact HEAD>');
requireThat(git('rev-parse','HEAD')===expected,'Source HEAD does not equal the approved frozen SHA');
requireThat(!git('status','--porcelain','--','extension/ui','extension/content','extension/core','extension/background','extension/adapter','extension/icons','extension/manifest.json'),'Runtime source is dirty; freeze before launch');
requireThat(plan.scenes.length===24&&new Set(plan.scenes.map(s=>s.id)).size===24&&plan.authorization.maxCapturesPerRound===24&&plan.authorization.maxJobMinutesIncludingSetup===10,'Manifest must contain exactly24 unique scenes within the ten-minute job');
for(const file of ['prompt-frame.mjs','browser/bootstrap.mjs','browser/archive-thought.mjs','browser/prompt.mjs','browser/chrome-shim.js','browser/settings-gap.mjs','browser/gap-state.mjs','browser/gap-scenes.mjs']){
 await stat(join(home,file));execFileSync(process.execPath,['--check',join(home,file)],{stdio:'pipe'});
}
const tracked=git('ls-files','-z','extension/ui','extension/content','extension/core','extension/background','extension/adapter','extension/icons','extension/manifest.json').split('\0').filter(Boolean);
const files={};for(const name of tracked)files[name]=hash(await readFile(join(source,name)));
const binding={head:expected,files,manifestSHA256:hash(await readFile(join(home,'scenes.json'))),harness:{}};
for(const name of ['runner.mjs','prompt-frame.mjs','browser/bootstrap.mjs','browser/archive-thought.mjs','browser/prompt.mjs','browser/chrome-shim.js','browser/settings-gap.mjs','browser/gap-state.mjs','browser/gap-scenes.mjs'])binding.harness[name]=hash(await readFile(join(home,name)));
const originalArchive=await readFile(join(source,'extension/ui/archive.js'));
for(const name of ['navigate','render','refresh','appendDocumentPage','paintInputTimeOrder'])requireThat(new RegExp('(?:function\\s+'+name+'\\b|(?:const|let)\\s+'+name+'\\s*=)').test(originalArchive.toString()),'Missing actual source bridge function '+name);
const require=createRequire(join(source,'extension/package.json'));
const playwrightModule=require.resolve(process.env.PLAYWRIGHT_MODULE||'playwright'),{chromium}=require(playwrightModule);
let executablePath=process.env.CHROME_PATH;
if(!executablePath)for(const candidate of [chromium.executablePath(),'/usr/bin/chromium','/usr/bin/chromium-browser']){try{await stat(candidate);executablePath=candidate;break;}catch{}}
requireThat(executablePath,'No already installed Chromium executable; no installation allowed');await stat(executablePath);
binding.environment={playwrightModule,executablePath,node:process.version};
if(args.includes('--preflight')){console.log(JSON.stringify({status:'SOURCE_PREFLIGHT_ONLY',head:expected,scenes:24,sourceFiles:tracked.length,playwrightModule,executablePath,browserLaunched:false}));process.exit(0);}
requireThat(round===1,'This separately approved cloud job has exactly one attempt; no round2 or retry');
requireThat(args.includes('--execute-approved'),'Execution requires explicit --execute-approved from the coordinating parent');
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
const record={round,head:expected,startedAt:new Date().toISOString(),status:'RUNNING',captures:[],notRun:plan.scenes.map(s=>s.id),elapsedMs:0};
session.rounds.push(record);
const save=async()=>{await writeFile(join(directory,'ledger.json'),JSON.stringify(record,null,2));await writeFile(sessionPath,JSON.stringify(session,null,2));};
await writeFile(join(directory,'source-binding.json'),JSON.stringify(binding,null,2));await save();
const bridge=`\n// Harness-only exports; the preceding production bytes are unchanged.\nglobalThis.__paiaVisualOwners={navigate,render,refresh,appendDocumentPage,paintInputTimeOrder,appShell,thoughts,contextCards,archiveNavigator,topicActions,getState:()=>state,get state(){return state},set state(v){state=v},get view(){return view},set view(v){view=v},get documentId(){return documentId},set documentId(v){documentId=v},get query(){return query},set query(v){query=v},get editor(){return editor},set editor(v){editor=v},get readerStream(){return readerStream},set readerStream(v){readerStream=v},get readingSnapshot(){return readingSnapshot},set readingSnapshot(v){readingSnapshot=v},get inputSortSnapshot(){return inputSortSnapshot},set inputSortSnapshot(v){inputSortSnapshot=v},get annualReading(){return annualReading},set annualReading(v){annualReading=v}};\n`;
const transforms=[];
const sourceRoot=await realpath(join(source,'extension')),harnessRoot=await realpath(home);
const allowedSource=new Set(tracked.map(name=>'/'+name.slice('extension/'.length)));
let activeScene=null,activePage=null,activeRequests=[],activeAction=null,activeTranscript=[],activeObservations=[],activeDialogs=[];
const allowedHarness=new Set(['browser/bootstrap.mjs','browser/archive-thought.mjs','browser/prompt.mjs','browser/chrome-shim.js','browser/settings-gap.mjs','browser/gap-state.mjs','browser/gap-scenes.mjs']);
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
   res.writeHead(200,{'content-type':mime,'cache-control':'no-store'});res.end(body);
  }catch(error){res.writeHead(404);res.end('Unavailable source path');fatal??='HTTP_SOURCE_FAILURE: '+error.message;}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 timer=setTimeout(()=>{fatal??='ROUND_TIME_BUDGET_EXCEEDED';void browser?.close();},budget);
 browser=await chromium.launch({headless:true,executablePath,args:['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run']});
 const shim=await readFile(join(home,'browser/chrome-shim.js'),'utf8');
 for(const scene of plan.scenes){
  requireThat(!fatal,fatal||'round stopped');requireThat(Date.now()-started<budget,'Round time budget exhausted');
  const context=await browser.newContext({viewport:{width:scene.width,height:scene.height},colorScheme:scene.theme,locale:'zh-CN',serviceWorkers:'block',acceptDownloads:false});
  activeScene=scene;activeAction='create-context';activeTranscript=[];activeObservations=[];activeDialogs=[];
  const requests=[];activeRequests=requests;await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!==base){fatal='NONLOOPBACK_REQUEST_BLOCKED: '+u.origin;requests.push({url:route.request().url(),blocked:true});return route.abort('blockedbyclient');}requests.push({url:u.pathname,blocked:false});return route.continue();});
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
  const poll=async(check,label)=>{const until=Date.now()+7000;while(!await check()){requireThat(!fatal,fatal||'round stopped');requireThat(Date.now()<until,'ACTION_ASSERTION_FAILED: '+label);await new Promise(r=>setTimeout(r,25));}};
  let cdp=null;
  for(const action of result.result.actions||[]){
   activeAction=action;requireThat(!fatal,fatal||'round stopped');
   if(action.action==='assertState'){
    await poll(()=>page.evaluate(({path,value})=>{const state=globalThis.__paiaGapStateEvidence?.();let actual=state;for(const part of path)actual=actual?.[part];return JSON.stringify(actual)===JSON.stringify(value);},{path:action.path,value:action.value}),JSON.stringify(action));continue;
   }
   const node=await target(action);
   if(action.action==='wait')await node.waitFor({state:action.state||'visible'});
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
    requireThat(scene.id==='nib-keyboard-ime-dirty-dark'&&typeof action.value==='string'&&action.value.length<=2,'IME_ACTION_SCOPE');await node.focus();cdp??=await context.newCDPSession(page);await cdp.send('Input.imeSetComposition',{text:action.value,selectionStart:action.value.length,selectionEnd:action.value.length});
   }
   else if(action.action==='observe'){
    requireThat(scene.id==='nib-keyboard-ime-dirty-dark','OBSERVATION_SCOPE');activeObservations.push({label:action.label,geometry:await readPromptGeometry(page,base)});
   }else throw Error('Unsupported trusted action');
  }

  activeAction={action:'ready',selector:result.result.readySelector};
  if(result.result.readySelector){const spec=typeof result.result.readySelector==='string'?{selector:result.result.readySelector}:result.result.readySelector;await (await target(spec)).first().waitFor({state:'visible'});}
  await page.mouse.move(0,0);
  if(scene.group==='prompt')for(const frame of page.frames()){if(frame.url().includes('/ui/prompt-surface.html'))await frame.waitForFunction(()=>!document.documentElement.hasAttribute('data-layout-pending'));}
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  requireThat(!fatal,fatal||'round stopped');
  const evidence=await page.evaluate(()=>({fatal:globalThis.__paiaVisualFatal,rpc:globalThis.__paiaVisualRPCLog,fixture:globalThis.__paiaVisualFixtureLimits,page:{width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight},owners:globalThis.__paiaVisualResult?.evidence,gapState:globalThis.__paiaGapStateEvidence?.()}));
  if(scene.group==='prompt')evidence.promptGeometry=await readPromptGeometry(page,base);
  evidence.promptCloseTranscript=activeTranscript;evidence.observations=activeObservations;evidence.nativeDialogs=activeDialogs;
  const bounds=evidence.gapState?.bounds;
  requireThat(bounds&&bounds.topics<=8&&bounds.sections.every(n=>n<=2)&&bounds.inputs<=12&&bounds.entries<=12&&bounds.contextItems<=3&&evidence.gapState.drafts.length<=4,'FINAL_SYNTHETIC_DATA_BOUND');
  requireThat(evidence.gapState.providerCalls===0&&evidence.gapState.realAccounts===0&&evidence.gapState.externalAllowed===false,'FINAL_NO_EXTERNAL_AUTHORITY');
  if(scene.group==='prompt'){
   requireThat(!(evidence.rpc||[]).some(r=>['close','PAIA_PROMPT_SELECTION_INSERT','PAIA_PROMPT_CREATE','PAIA_PROMPT_EDIT'].includes(r.command)),'UNEXPECTED_PROMPT_WRITE_OR_CLOSE');
   if(scene.id==='nib-copy-failure')requireThat(evidence.promptGeometry.clipboardDenied?.attempted===true,'CLIPBOARD_REFUSAL_NOT_REACHED');
   if(scene.id==='nib-keyboard-ime-dirty-dark')requireThat(evidence.promptGeometry.editor.visible&&evidence.promptGeometry.editor.text?.startsWith('合成输入 01')&&evidence.promptGeometry.inputEvents.some(e=>e.type==='compositionstart'&&e.trusted)&&evidence.promptGeometry.inputEvents.some(e=>e.type==='keydown'&&e.key==='Escape'&&e.trusted),'NATIVE_COMPOSITION_OR_DIRTY_GUARD_NOT_OBSERVED');
  }
  requireThat(!evidence.fatal,evidence.fatal);requireThat(record.captures.length<24,'Capture ceiling exceeded');const filename=scene.id+'.png';await page.screenshot({path:join(directory,filename),animations:'disabled'});
  record.captures.push({scene,...evidence,requests,file:filename,sha256:hash(await readFile(join(directory,filename))),status:'CAPTURED_NOT_VISUALLY_ACCEPTED'});record.notRun=record.notRun.filter(id=>id!==scene.id);await save();console.log(JSON.stringify({event:'CAPTURED',round,scene:scene.id,file:join(directory,filename),count:record.captures.length,status:'CAPTURED_NOT_VISUALLY_ACCEPTED'}));await context.close();activePage=null;activeScene=null;activeAction=null;
 }
 record.status='CAPTURE_COMPLETE_PENDING_PIXEL_REVIEW';
}catch(error){
 record.status='STOPPED_NO_AUTOMATIC_RETRY';record.error=fatal||error.stack||String(error);process.exitCode=1;
 // Retain the original failed action and RPC transcript before closing the page.
 // Diagnostics never alter source UI or manufacture a successful scene/capture.
 const failure={scene:activeScene,action:activeAction,requests:activeRequests,promptCloseTranscript:activeTranscript,observations:activeObservations,nativeDialogs:activeDialogs,originalError:record.error};
 if(activePage&&!activePage.isClosed())try{
  failure.page=await activePage.evaluate(()=>({fatal:globalThis.__paiaVisualFatal,rpc:globalThis.__paiaVisualRPCLog,fixture:globalThis.__paiaVisualFixtureLimits,ready:globalThis.__paiaVisualResult?.status,gapState:globalThis.__paiaGapStateEvidence?.()}));
  if(activeScene?.group==='prompt')try{failure.promptGeometry=await readPromptGeometry(activePage,new URL(activePage.url()).origin);}catch(diagnosticError){failure.promptGeometryError=String(diagnosticError);}
 }catch(diagnosticError){failure.diagnosticError=String(diagnosticError);}
 await writeFile(join(directory,'failed-scene.json'),JSON.stringify(failure,null,2));
}
finally{
 clearTimeout(timer);await browser?.close().catch(()=>{});if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r));}
 record.elapsedMs=Date.now()-started;session.elapsedMs+=record.elapsedMs;record.finishedAt=new Date().toISOString();
 await writeFile(join(directory,'served-transformations.json'),JSON.stringify(transforms,null,2));await save();await lock.close();await unlink(lockPath);
 console.log(JSON.stringify({round,status:record.status,captures:record.captures.length,notRun:record.notRun,elapsedMs:record.elapsedMs,error:record.error||null}));
}
