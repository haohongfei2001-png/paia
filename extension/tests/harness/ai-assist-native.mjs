import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {routeComposer,isolated} from './prompt-composer.mjs';
import {eventually} from './fake-chatgpt.mjs';
import {installAssistDeadlineFixture} from './assist-deadline-fixture.mjs';

// Explicit private test host: real isolated reply/composer owners communicate
// with a real extension-origin IndexedDB session through this offline bridge.
// The bridge is not a production RPC or a cross-process atomicity claim.
export async function verifyPrivateAssistNative(h,{extensionPath,dependencyRoot,label,phase=()=>{}}) {
 phase('setup');
 await routeComposer(h.context,dependencyRoot,{signature:'current'});
 const page=await h.context.newPage();let world,qualifyBinding;
 try {
  await page.goto('https://chatgpt.com/c/prompt-insertion-fixture');
  await page.waitForFunction(()=>!!globalThis.fixture?.view);
  world=await isolated(page,h.extensionId);
  const module=await readFile(join(extensionPath,'content/assist-result-runtime.js'),'utf8');
  await world.run(module+'\nglobalThis.AssistResultController=globalThis.PAIAAssistResultController;');
  await world.run(`globalThis.assistReads=0;globalThis.assistInvalidations=0;
   const reader=new PAIAChatGPTCurrentReplyAdapter(),snapshot=reader.snapshot.bind(reader);
   reader.snapshot=()=>{assistReads++;return snapshot();};
   globalThis.privateAssist=new AssistResultController({reader,composer:new PAIAChatGPTComposerAdapter(),onInvalidated:()=>assistInvalidations++});`);
  await page.evaluate(()=>{
   const history=document.createElement('section');history.id='assist-history';document.querySelector('main').prepend(history);fixture.round=0;
   fixture.reply=(id,text,complete)=>{const article=document.createElement('article');article.dataset.testid='conversation-turn-'+id;
    const node=document.createElement('div');node.dataset.messageAuthorRole='assistant';node.dataset.messageId=id;
    const markdown=document.createElement('div');markdown.className='markdown';const p=document.createElement('p');p.textContent=text;markdown.append(p);node.append(markdown);article.append(node);
    if(complete){const b=document.createElement('button');b.dataset.testid='copy-turn-action-button';b.textContent='Copy';article.append(b);}return article;};
   fixture.user=()=>{const user=document.createElement('div');user.dataset.messageAuthorRole='user';user.dataset.messageId='assist-user-'+fixture.round;user.textContent='Synthetic already-sent user';history.append(user);};
   fixture.user();history.append(fixture.reply('assist-historical','HISTORICAL_BODY_MUST_NOT_READ',true));
   fixture.start=()=>{fixture.round++;fixture.user();const stop=document.createElement('button');stop.dataset.testid='stop-button';stop.textContent='Stop';document.querySelector('form').append(stop);fixture.latest=fixture.reply('assist-reply-'+fixture.round,'ASSIST_NATIVE_CURRENT_ONLY',false);history.append(fixture.latest);};
   fixture.finish=()=>{document.querySelector('[data-testid="stop-button"]')?.remove();const b=document.createElement('button');b.dataset.testid='copy-turn-action-button';b.textContent='Copy';fixture.latest.append(b);};
  });
  await h.archive.exposeFunction('__privateAssistPhase',name=>{if(!/^(?:before-provider-deadline|provider-(?:timeout|dispose|dismiss|revoke)-(?:resolve|reject)-(?:qualifying|entered))$/.test(name))throw Error('invalid body-free Assist phase');phase(name);});
  await h.archive.evaluate(installAssistDeadlineFixture);
  await h.archive.exposeFunction('__privateAssistProbe',async request=>world.run(`privateAssist.probe(${JSON.stringify(request)})`));
  // Explicit test-only, context-bound bridge: final content qualification
  // invokes the original session callback, never a constant authorization.
  await world.cdp.send('Runtime.addBinding',{name:'__privateAssistQualify',executionContextId:world.id});
  await world.run(`globalThis.__assistQualifications=new Map();globalThis.__askAssistQualification=key=>new Promise(resolve=>{__assistQualifications.set(key,resolve);__privateAssistQualify(key);});`);
  qualifyBinding=async event=>{
   if(event.name!=='__privateAssistQualify'||event.executionContextId!==world.id)return;
   let allowed=false;try{allowed=await h.archive.evaluate(async key=>{const request=globalThis.__assistInsertCapabilities?.get(key);return !!request&&await request.qualify()===true&&request.isCurrent()===true;},event.payload);}catch{}
   await world.run(`(()=>{const key=${JSON.stringify(event.payload)},resolve=__assistQualifications.get(key);__assistQualifications.delete(key);resolve?.(${JSON.stringify(allowed)});})()`).catch(()=>{});
  };world.cdp.on('Runtime.bindingCalled',qualifyBinding);
  await h.archive.exposeFunction('__privateAssistInsert',async request=>world.run(`(async()=>{const request=${JSON.stringify(request)},generation=assistInvalidations;let qualified=null;try{return await privateAssist.insert({...request,qualify:async()=>{qualified=await __askAssistQualification(request.capability)===true;return qualified;},isCurrent:()=>qualified!==false&&assistInvalidations===generation});}finally{qualified=false;}})()`));
  // Actual Chrome tab metadata qualifies the offline actor. The documentId
  // and host transport remain private fixture capabilities, not worker auth.
  // Synthetic financial authority is explicit and fixture-only; production
  // Foundation has no authority. Actual selected Context list here is empty.
  const initial=await h.archive.evaluate(async label=>{
   const {OrganizerStore}=await import(chrome.runtime.getURL('core/organizer/store.js')),
    {AssistReplyLease}=await import(chrome.runtime.getURL('background/assist-reply-lease.js')),
    {LocalAssistSession}=await import(chrome.runtime.getURL('core/ai-usage/local-assist-session.js'));
   const local={v:{},async get(k){return {[k]:this.v[k]};},async set(v){Object.assign(this.v,v);}},s=new OrganizerStore(local,{name:'assist-native-private-'+label});await s.consent(true);
   const snapshot=()=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async n=>[n,await t.all(n)]))));
   let mirror=null,calls=0,payload=null;
   const [tab]=await chrome.tabs.query({url:'https://chatgpt.com/c/prompt-insertion-fixture'});if(!tab||tab.active!==true)throw Error('Synthetic actor tab is not actually active');
   const sender={id:chrome.runtime.id,tab:{id:tab.id},frameId:0,documentId:'synthetic-private-document',documentLifecycle:'active',url:'https://chatgpt.com/c/prompt-insertion-fixture'};
   const lease=new AssistReplyLease({runtimeId:chrome.runtime.id,tabs:{get:id=>chrome.tabs.get(id)},probe:async(_host,request)=>{const result=await __privateAssistProbe(request);mirror=result?.binding;return result;},current:(_host,b)=>JSON.stringify(mirror)===JSON.stringify(b)});
   const provider={describe:()=>({providerId:'synthetic',version:'1',executionKind:'fixture'}),execute:async value=>{calls++;payload=value;return JSON.stringify({version:1,kind:'SUGGESTION',text:'Explain next.',condition:'After checking the prerequisite'});}};
   const session=new LocalAssistSession(s,{lease,provider,resolveAuthority:async(_t,r)=>({allowed:true,principalId:'synthetic',libraryId:'synthetic',consentEpoch:'synthetic',jobTypes:['AI_ASSIST'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}})});
   globalThis.__assistNative={s,snapshot,lease,session,sender,calls:()=>calls,payload:()=>payload};
   let denied=false;try{await lease.observe(sender);}catch{denied=true;}return {denied,calls};
  },label);
  assert.deepEqual(initial,{denied:true,calls:0});assert.equal(await world.run('assistReads'),0);
  await world.run('privateAssist.configure(true)');
  await h.archive.evaluate(()=>__assistNative.lease.configure({replyAccess:true,remoteProcessing:true}));
  for(let i=0;i<10;i++)await world.run('privateAssist.probe()');
  assert.equal(await world.run('assistReads'),0,'open/observe never reads historical body');
  await page.evaluate(()=>fixture.start());await world.run('privateAssist.scan()');
  assert.equal(await world.run('privateAssist.probe().ready===true'),false,'streaming reply cannot qualify');
  await page.evaluate(()=>fixture.finish());await eventually(()=>world.run('privateAssist.probe().ready===true'),'actual prospective completed reply qualifies');
  phase('pipeline');
  const pipeline=await h.archive.evaluate(async()=>{
   const f=__assistNative;f.before=await f.snapshot();f.cap=await f.lease.observe(f.sender);
   const handles=await Promise.all(Array.from({length:10},()=>f.session.prepare({lease:f.cap})));f.handle=handles[0];
   const results=await Promise.all(handles.map(x=>f.session.run(x))),rows=await f.snapshot();
   for(const n of ['records','blocks','inputStates','thoughts','placements','documents','libraryDocuments'])if(!Object.hasOwn(rows,n)||JSON.stringify(rows[n])!==JSON.stringify(f.before[n]))throw Error('canonical table changed '+n);
   return {native:indexedDB instanceof IDBFactory,same:new Set(handles).size,calls:f.calls(),result:results[0],jobs:rows.organizerJobs.length,children:rows.organizerJobs[0].childIds.length,dependencies:rows.organizerJobs[0].items.length,state:rows.organizerJobs[0].state,attempts:rows.organizerUsage.map(x=>x.attemptCount),bodyFree:!JSON.stringify(rows).includes('ASSIST_NATIVE_CURRENT_ONLY')&&!JSON.stringify(rows).includes('Explain next.'),exactReply:f.payload().reply.trim()==='ASSIST_NATIVE_CURRENT_ONLY',context:f.payload().context};
  });
  assert.deepEqual(pipeline,{native:true,same:1,calls:1,result:{version:1,kind:'SUGGESTION',text:'Explain next.',condition:'After checking the prerequisite'},jobs:1,children:1,dependencies:0,state:'COMMITTED',attempts:[1],bodyFree:true,exactReply:true,context:[]});
  phase('before-provider-deadline');
  const beforeProvider=await h.archive.evaluate(async label=>{
   const {OrganizerStore}=await import(chrome.runtime.getURL('core/organizer/store.js')),{AssistReplyLease}=await import(chrome.runtime.getURL('background/assist-reply-lease.js')),{LocalAssistSession}=await import(chrome.runtime.getURL('core/ai-usage/local-assist-session.js'));
   const storage={v:{},async get(k){return {[k]:this.v[k]};},async set(v){Object.assign(this.v,v);}},s=new OrganizerStore(storage,{name:'assist-before-provider-'+label});await s.consent(true);s.organizerBudget.limits={...s.organizerBudget.limits,timeoutMs:25};
   let mirror=null,calls=0,release,ready,finished;const held=new Promise(r=>release=r),qualifying=new Promise(r=>ready=r),completed=new Promise(r=>finished=r);
   const lease=new AssistReplyLease({runtimeId:chrome.runtime.id,tabs:{get:id=>chrome.tabs.get(id)},probe:async(_host,request)=>{const result=await __privateAssistProbe(request);mirror=result?.binding;return result;},current:(_host,b)=>JSON.stringify(mirror)===JSON.stringify(b)});lease.configure({replyAccess:true,remoteProcessing:true});
   const session=new LocalAssistSession(s,{lease,provider:{describe:()=>({providerId:'synthetic',version:'1',executionKind:'fixture'}),execute:async()=>{calls++;return JSON.stringify({version:1,kind:'SUGGESTION',text:'MUST_NOT_ENTER_PROVIDER',condition:''});}},resolveAuthority:async(_t,r)=>({allowed:true,principalId:'synthetic',libraryId:'synthetic',consentEpoch:'synthetic',jobTypes:['AI_ASSIST'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}})});
   try{
    const cap=await lease.observe(__assistNative.sender),handle=await session.prepare({lease:cap}),snapshot=lease.snapshot.bind(lease);let snapshots=0;
    lease.snapshot=async(...args)=>{snapshots++;if(snapshots!==3)return snapshot(...args);ready();try{await held;return await snapshot(...args);}finally{finished();}};
    const run=session.run(handle).then(()=>({published:true}),error=>({code:error.code}));
    const first=await Promise.race([qualifying.then(()=>({qualifying:true})),run.then(outcome=>({outcome}))]);if(!first.qualifying)throw Error('Assist stopped before held final qualification '+JSON.stringify(first));
    const outcome=await run,all=()=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async n=>[n,await t.all(n)])))),before=await all();
    release();await completed;await Promise.resolve();const after=await all();let resultDenied=false;try{await session.result(handle);}catch{resultDenied=true;}
    return {calls,code:outcome.code,published:outcome.published===true,resultDenied,unchanged:JSON.stringify(before)===JSON.stringify(after),jobs:after.organizerJobs.map(j=>j.state),attempts:after.organizerUsage.map(r=>[r.state,r.attemptCount,r.spendState]),acks:after.organizerWorkItems.filter(r=>r.state==='ACKNOWLEDGED').length,bodyFree:!JSON.stringify(after).includes('MUST_NOT_ENTER_PROVIDER')};
   }finally{release();session.dispose();lease.dispose();await s.repository.close();}
  },label);
  assert.deepEqual(beforeProvider,{calls:0,code:'OUTCOME_UNKNOWN',published:false,resultDenied:true,unchanged:true,jobs:['OUTCOME_UNKNOWN'],attempts:[['OUTCOME_UNKNOWN',1,'RESERVATION_RETAINED']],acks:0,bodyFree:true});
  const bounded=await h.archive.evaluate(async label=>{
   const {OrganizerStore}=await import(chrome.runtime.getURL('core/organizer/store.js')),{AssistReplyLease}=await import(chrome.runtime.getURL('background/assist-reply-lease.js')),{LocalAssistSession}=await import(chrome.runtime.getURL('core/ai-usage/local-assist-session.js'));
   const results=[];
   for(const stop of ['timeout','dispose','dismiss','revoke'])for(const late of ['resolve','reject']){
    await __privateAssistPhase('provider-'+stop+'-'+late+'-qualifying');
    const storage={v:{},async get(k){return {[k]:this.v[k]};},async set(v){Object.assign(this.v,v);}},s=new OrganizerStore(storage,{name:'assist-bounded-'+label+'-'+stop+'-'+late});await s.consent(true);s.organizerBudget.limits={...s.organizerBudget.limits,timeoutMs:25};
    let mirror=null,calls=0,signal,deadline,finish,started,physical;const entered=new Promise(r=>started=r);
    const lease=new AssistReplyLease({runtimeId:chrome.runtime.id,tabs:{get:id=>chrome.tabs.get(id)},probe:async(_host,request)=>{const result=await __privateAssistProbe(request);mirror=result?.binding;return result;},current:(_host,b)=>JSON.stringify(mirror)===JSON.stringify(b)});lease.configure({replyAccess:true,remoteProcessing:true});
    const session=new LocalAssistSession(s,{lease,provider:{describe:()=>({providerId:'synthetic',version:'1',executionKind:'fixture'}),execute:async(_payload,options)=>{calls++;signal=options?.signal;deadline=options?.timeoutMs;started();physical=new Promise((resolve,reject)=>{finish=()=>late==='resolve'?resolve(JSON.stringify({version:1,kind:'SUGGESTION',text:'LATE_MUST_NOT_PUBLISH',condition:''})):reject(Error('synthetic late rejection'));});return physical;}},resolveAuthority:async(_t,r)=>({allowed:true,principalId:'synthetic',libraryId:'synthetic',consentEpoch:'synthetic',jobTypes:['AI_ASSIST'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}})});
    let timer,run;try{
     const cap=await lease.observe(__assistNative.sender),handle=await session.prepare({lease:cap});timer=__controlAssistProviderDeadline(25);
     run=session.run(handle).then(()=>({published:true}),e=>({code:e.code}));
     const first=await Promise.race([entered.then(()=>({entered:true})),run.then(outcome=>({outcome}))]);if(!first.entered)throw Error('Assist settled before provider entry '+JSON.stringify({stop,late,...first}));
     await __privateAssistPhase('provider-'+stop+'-'+late+'-entered');timer.arm();
     if(stop==='dispose')session.dispose();if(stop==='dismiss')session.dismiss(handle);if(stop==='revoke')lease.configure({replyAccess:true,remoteProcessing:false});
     const outcome=await run,all=()=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...t.tx.objectStoreNames].map(async n=>[n,await t.all(n)])))),before=await all();finish();await physical.catch(()=>{});const after=await all();
     let resultDenied=false,inserts=0;try{await session.result(handle);}catch{resultDenied=true;}try{await session.insert(handle,{controller:{insert:()=>{inserts++;}},operationId:'synthetic-late-operation',conditionPresented:true});}catch{}
     results.push({stop,late,calls,deadline,timer:timer.state(),aborted:signal instanceof AbortSignal&&signal.aborted,published:outcome.published===true,code:outcome.code,resultDenied,inserts,unchanged:JSON.stringify(before)===JSON.stringify(after),jobs:after.organizerJobs.map(j=>j.state),attempts:after.organizerUsage.map(r=>[r.state,r.attemptCount,r.spendState]),acks:after.organizerWorkItems.filter(r=>r.state==='ACKNOWLEDGED').length,bodyFree:!JSON.stringify(after).includes('LATE_MUST_NOT_PUBLISH')});
    }finally{session.dispose();try{await run;}finally{timer?.restore();lease.dispose();await s.repository.close();}}
   }return {nativeFactory:indexedDB instanceof IDBFactory,results};
  },label);
  assert.equal(bounded.nativeFactory,true);assert.equal(bounded.results.length,8);
  for(const r of bounded.results){assert.equal(r.calls,1);assert.equal(r.deadline,25);assert.deepEqual(r.timer,{captured:true,armed:true,cancelled:true});assert.equal(r.aborted,true);assert.equal(r.published,false);assert.equal(r.code,r.stop==='timeout'?'OUTCOME_UNKNOWN':'STALE_BASE');assert.equal(r.resultDenied,true);assert.equal(r.inserts,0);assert.equal(r.unchanged,true);assert.deepEqual(r.jobs,['OUTCOME_UNKNOWN']);assert.deepEqual(r.attempts,[['OUTCOME_UNKNOWN',1,'RESERVATION_RETAINED']]);assert.equal(r.acks,0);assert.equal(r.bodyFree,true);}
  console.log('AI_NATIVE_BOUNDED_ASSIST',label,JSON.stringify(bounded));
  phase('insertion');
  const insert=async(operationId,conditionPresented)=>h.archive.evaluate(async({operationId,conditionPresented})=>{
   const f=__assistNative;return f.session.insert(f.handle,{operationId,conditionPresented,controller:{insert:async request=>{
    if(request.isCurrent()!==true)return {status:'failed',reason:'stale_assist'};
    const {isCurrent,qualify,...transport}=request,capability=crypto.randomUUID();
    globalThis.__assistInsertCapabilities??=new Map();__assistInsertCapabilities.set(capability,{isCurrent,qualify});
    try{return await __privateAssistInsert({...transport,capability});}finally{__assistInsertCapabilities.delete(capability);}
   }}});
  },{operationId,conditionPresented});
  await page.evaluate(()=>fixture.set('ABCDE',1,4));
  const op=await h.archive.evaluate(()=>crypto.randomUUID());
  assert.deepEqual(await insert(op,false),{status:'failed',reason:'stale_assist'});
  assert.equal(await page.evaluate(()=>fixture.text()),'ABCDE','unpresented condition denies delivery');
  const insertedOp=await h.archive.evaluate(()=>crypto.randomUUID()),inserted=await insert(insertedOp,true);
  assert.equal(inserted.status,'inserted');assert.equal(inserted.verified,true);
  assert.equal(await page.evaluate(()=>fixture.text()),'ABCDExplain next.E','actual original composer preserves selected draft');
  assert.equal(await page.evaluate(()=>fixture.send),0);assert.equal(await page.evaluate(()=>fixture.enter),0);
  assert.equal((await insert(insertedOp,true)).replayed,true);assert.equal(await page.evaluate(()=>fixture.text()),'ABCDExplain next.E','successful operation replay never inserts twice');
  // A fresh operation under IME must fail before mutating the draft.
  await page.evaluate(()=>{fixture.set('IME_DRAFT',3,3);fixture.view.dom.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'中'}));});
  const imeOp=await h.archive.evaluate(()=>crypto.randomUUID());
  assert.equal((await insert(imeOp,true)).reason,'composition_active');
  assert.equal(await page.evaluate(()=>fixture.text()),'IME_DRAFT');
  await page.evaluate(()=>fixture.view.dom.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'中'})));
  const repeat=await insert(imeOp,true);assert.equal(repeat.replayed,true);assert.equal(repeat.reason,'composition_active');assert.equal(await page.evaluate(()=>fixture.text()),'IME_DRAFT');
  // Mutation is consumed in the isolated delivery owner immediately before
  // native composer invocation, independently of the synthetic host mirror.
  await page.evaluate(()=>{fixture.set('DRAFT',2,2);fixture.view.dom.addEventListener('focus',()=>fixture.set('CHANGED_DRAFT',0,0),{once:true});document.querySelector('#blur').focus();});
  const draft=await insert(await h.archive.evaluate(()=>crypto.randomUUID()),true);assert.equal(draft.status,'failed');assert.equal(draft.reason,'draft_changed');assert.equal(await page.evaluate(()=>fixture.text()),'CHANGED_DRAFT');
  await page.evaluate(()=>fixture.set('UNCERTAIN',9,9));
  await world.run('globalThis.originalAssistExec=document.execCommand.bind(document);document.execCommand=(...args)=>{originalAssistExec(...args);return false;};');
  const uncertainOp=await h.archive.evaluate(()=>crypto.randomUUID()),uncertain=await insert(uncertainOp,true);assert.equal(uncertain.status,'uncertain');
  const uncertainDraft=await page.evaluate(()=>fixture.text());await world.run('document.execCommand=originalAssistExec;');
  assert.equal((await insert(uncertainOp,true)).replayed,true);assert.equal(await page.evaluate(()=>fixture.text()),uncertainDraft,'uncertain operation replay never inserts twice');
  // Selected Context changes after session.result() but before the actual
  // isolated content owner's qualification must never enter the composer.
  const retainedDraft=await page.evaluate(()=>fixture.text());
  phase('insertion-authority');
  const finalAuthority=await h.archive.evaluate(async()=>{
   const {ContextCardsService}=await import(chrome.runtime.getURL('core/context-cards.js')),
    {LocalAssistSession}=await import(chrome.runtime.getURL('core/ai-usage/local-assist-session.js')),
    {OrganizerStore}=await import(chrome.runtime.getURL('core/organizer/store.js'));
   const f=__assistNative,local={v:{},async get(k){return {[k]:this.v[k]};},async set(v){Object.assign(this.v,v);}},isolatedStore=new OrganizerStore(local,{name:'assist-final-authority-'+crypto.randomUUID()});await isolatedStore.consent(true);
   const cards=new ContextCardsService(isolatedStore),results=[];let calls=0;
   for(const key of ['global','rules'])await cards.change({kind:'access',operationId:crypto.randomUUID(),epoch:'initial',key,expectedRevision:0,enabled:true});
   for(const change of ['edit','revoke']){
    const contextAbort=new AbortController(),contextExpires=Date.now()+600000,contextProcessing={resolve:async(_t,scope)=>({version:1,store:isolatedStore,scope,epoch:'synthetic-native-context',processing:true,expiresAt:contextExpires,revocationSignal:contextAbort.signal}),isCurrent:()=>!contextAbort.signal.aborted};
    const id=crypto.randomUUID();await cards.change({kind:'put',card:'rules',operationId:crypto.randomUUID(),epoch:'initial',itemId:id,expectedRevision:0,body:'SYNTHETIC selected insertion Context',section:'Synthetic'});
    const session=new LocalAssistSession(isolatedStore,{lease:f.lease,contextSelector:()=>[id],contextProcessing,contractVersion:'assist-insert-'+change,provider:{describe:()=>({providerId:'synthetic',version:'1',executionKind:'fixture'}),execute:async()=>{calls++;return JSON.stringify({version:1,kind:'SUGGESTION',text:'MUST_NOT_INSERT',condition:''});}},resolveAuthority:async(_t,r)=>({allowed:true,principalId:'synthetic',libraryId:'synthetic',consentEpoch:'synthetic',jobTypes:['AI_ASSIST'],scope:{evidenceKeys:r.evidenceKeys,coverage:r.coverage}})});
    try{const lease=await f.lease.observe(f.sender),handle=await session.prepare({lease});await session.run(handle);
     const result=await session.insert(handle,{operationId:crypto.randomUUID(),controller:{insert:async request=>{
      const {isCurrent,qualify,...transport}=request,capability=crypto.randomUUID();
      __assistInsertCapabilities.set(capability,{isCurrent,qualify:async()=>{
       if(change==='edit')await cards.change({kind:'put',card:'rules',operationId:crypto.randomUUID(),epoch:'initial',itemId:id,expectedRevision:1,body:'SYNTHETIC changed selected Context',section:'Synthetic'});
       else contextAbort.abort();
       return qualify();
      }});
      try{return await __privateAssistInsert({...transport,capability});}finally{__assistInsertCapabilities.delete(capability);}
     }}});results.push({change,result});
    }finally{session.dispose();}
   }return {results,calls};
  });
  assert.equal(finalAuthority.calls,2);for(const entry of finalAuthority.results)assert.deepEqual(entry.result,{status:'failed',reason:'stale_assist'},entry.change);
  assert.equal(await page.evaluate(()=>fixture.text()),retainedDraft);assert.equal(await page.evaluate(()=>fixture.send),0);console.log('AI_NATIVE_FINAL_INSERT_AUTHORITY',label,JSON.stringify(finalAuthority));
  assert.equal((await h.archive.evaluate(()=>__assistNative.session.result(__assistNative.handle))).kind,'SUGGESTION','independent selected Context tests did not invalidate the original zero-Context session');
  // Live current-node mutation must invalidate immediately in the isolated owner.
  const latestStale=await world.run(`(()=>{const state=privateAssist.probe();privateAssist.reader.current.querySelector('.markdown').append(document.createTextNode('changed'));return privateAssist.insert({binding:state.binding,text:'UNQUALIFIED',condition:'',operationId:crypto.randomUUID(),isCurrent:()=>true,qualify:async()=>true});})()`);
  assert.equal(latestStale.status,'failed');assert.equal(latestStale.reason,'stale_assist');
  assert.equal(await page.evaluate(()=>fixture.send),0);
  let revoked=false;try{await h.archive.evaluate(()=>__assistNative.session.result(__assistNative.handle));}catch{revoked=true;}assert.equal(revoked,true);
  assert.equal(await h.archive.evaluate(()=>__assistNative.calls()),1);assert.equal(await page.evaluate(()=>fixture.text()).then(x=>x.includes('UNQUALIFIED')),false);
  await world.run('document.defaultView.dispatchEvent(new Event("pagehide"))');assert.equal(await world.run('privateAssist.enabled'),false);
  await h.archive.evaluate(()=>__assistNative.lease.configure({replyAccess:true,remoteProcessing:false}));
  let consentDenied=false;try{await h.archive.evaluate(()=>__assistNative.session.result(__assistNative.handle));}catch{consentDenied=true;}assert.equal(consentDenied,true);
  console.log('AI_NATIVE_PRIVATE_ASSIST',label,JSON.stringify({native:true,zeroContext:true,oneAttempt:true,bodyFree:true,conditionGuard:true,selection:true,imeReplayDenied:true,draftChangedDenied:true,uncertainReplayDenied:true,latestMutationDenied:true,pagehide:true,consentDenied:true,send:0}));
 } finally {if(world&&qualifyBinding)world.cdp.off('Runtime.bindingCalled',qualifyBinding);await h.archive.evaluate(()=>{__assistNative?.session.dispose();__assistNative?.lease.dispose();}).catch(()=>{});await world?.run('privateAssist.dispose()').catch(()=>{});await page.close();}
}
