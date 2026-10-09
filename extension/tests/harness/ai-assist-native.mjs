import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {routeComposer,isolated} from './prompt-composer.mjs';
import {eventually} from './fake-chatgpt.mjs';

// Explicit private test host: real isolated reply/composer owners communicate
// with a real extension-origin IndexedDB session through this offline bridge.
// The bridge is not a production RPC or a cross-process atomicity claim.
export async function verifyPrivateAssistNative(h,{extensionPath,dependencyRoot,label}) {
 await routeComposer(h.context,dependencyRoot,{signature:'current'});
 const page=await h.context.newPage();let world;
 try {
  await page.goto('https://chatgpt.com/c/prompt-insertion-fixture');
  await page.waitForFunction(()=>!!globalThis.fixture?.view);
  world=await isolated(page,h.extensionId);
  const module=await readFile(join(extensionPath,'content/assist-result.js'),'utf8');
  await world.run(module.replace('export class AssistResultController','globalThis.AssistResultController = class AssistResultController'));
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
  await h.archive.exposeFunction('__privateAssistProbe',async request=>world.run(`privateAssist.probe(${JSON.stringify(request)})`));
  await h.archive.exposeFunction('__privateAssistInsert',async request=>world.run(`privateAssist.insert({...${JSON.stringify(request)},isCurrent:()=>true})`));
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
  const pipeline=await h.archive.evaluate(async()=>{
   const f=__assistNative;f.before=await f.snapshot();f.cap=await f.lease.observe(f.sender);
   const handles=await Promise.all(Array.from({length:10},()=>f.session.prepare({lease:f.cap})));f.handle=handles[0];
   const results=await Promise.all(handles.map(x=>f.session.run(x))),rows=await f.snapshot();
   for(const n of ['records','blocks','inputStates','thoughts','placements','documents','libraryDocuments'])if(!Object.hasOwn(rows,n)||JSON.stringify(rows[n])!==JSON.stringify(f.before[n]))throw Error('canonical table changed '+n);
   return {native:indexedDB instanceof IDBFactory,same:new Set(handles).size,calls:f.calls(),result:results[0],jobs:rows.organizerJobs.length,children:rows.organizerJobs[0].childIds.length,dependencies:rows.organizerJobs[0].items.length,state:rows.organizerJobs[0].state,attempts:rows.organizerUsage.map(x=>x.attemptCount),bodyFree:!JSON.stringify(rows).includes('ASSIST_NATIVE_CURRENT_ONLY')&&!JSON.stringify(rows).includes('Explain next.'),exactReply:f.payload().reply.trim()==='ASSIST_NATIVE_CURRENT_ONLY',context:f.payload().context};
  });
  assert.deepEqual(pipeline,{native:true,same:1,calls:1,result:{version:1,kind:'SUGGESTION',text:'Explain next.',condition:'After checking the prerequisite'},jobs:1,children:1,dependencies:0,state:'COMMITTED',attempts:[1],bodyFree:true,exactReply:true,context:[]});
  const insert=async(operationId,conditionPresented)=>h.archive.evaluate(async({operationId,conditionPresented})=>{
   const f=__assistNative;return f.session.insert(f.handle,{operationId,conditionPresented,controller:{insert:async request=>{
    if(request.isCurrent()!==true)return {status:'failed',reason:'stale_assist'};
    const {isCurrent,...transport}=request;return __privateAssistInsert(transport);
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
  // Live current-node mutation must invalidate immediately in the isolated owner.
  const latestStale=await world.run(`(()=>{const state=privateAssist.probe();privateAssist.reader.current.querySelector('.markdown').append(document.createTextNode('changed'));return privateAssist.insert({binding:state.binding,text:'UNQUALIFIED',condition:'',operationId:crypto.randomUUID(),isCurrent:()=>true});})()`);
  assert.equal(latestStale.status,'failed');assert.equal(latestStale.reason,'stale_assist');
  assert.equal(await page.evaluate(()=>fixture.send),0);
  let revoked=false;try{await h.archive.evaluate(()=>__assistNative.session.result(__assistNative.handle));}catch{revoked=true;}assert.equal(revoked,true);
  assert.equal(await h.archive.evaluate(()=>__assistNative.calls()),1);assert.equal(await page.evaluate(()=>fixture.text()).then(x=>x.includes('UNQUALIFIED')),false);
  await world.run('document.defaultView.dispatchEvent(new Event("pagehide"))');assert.equal(await world.run('privateAssist.enabled'),false);
  await h.archive.evaluate(()=>__assistNative.lease.configure({replyAccess:true,remoteProcessing:false}));
  let consentDenied=false;try{await h.archive.evaluate(()=>__assistNative.session.result(__assistNative.handle));}catch{consentDenied=true;}assert.equal(consentDenied,true);
  console.log('AI_NATIVE_PRIVATE_ASSIST',label,JSON.stringify({native:true,zeroContext:true,oneAttempt:true,bodyFree:true,conditionGuard:true,selection:true,imeReplayDenied:true,draftChangedDenied:true,uncertainReplayDenied:true,latestMutationDenied:true,pagehide:true,consentDenied:true,send:0}));
 } finally {await h.archive.evaluate(()=>{__assistNative?.session.dispose();__assistNative?.lease.dispose();}).catch(()=>{});await world?.run('privateAssist.dispose()').catch(()=>{});await page.close();}
}
