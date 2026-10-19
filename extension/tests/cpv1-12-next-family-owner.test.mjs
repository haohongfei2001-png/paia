import test from 'node:test';import assert from 'node:assert/strict';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {NextPromptCommands} from '../background/prompt-next.js';
const url='https://chatgpt.com/c/family-owner',nonce='11111111-1111-4111-8111-111111111111';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function fixture(){
 const f=await completeFixture({texts:['Explain sorting','Explain sorting']}),service=new PromptReuseService(f.s),stored={},sends=[];
 let binding={url,conversation:'/c/family-owner',cycle:1,replyId:'reply-1',revision:0},result={status:'inserted',verified:true};
 const api={runtime:{id:'extension',getURL:p=>'chrome-extension://extension/'+p,sendMessage:async()=>{}},storage:{local:{get:async()=>({...stored}),set:async x=>Object.assign(stored,x)}},tabs:{get:async()=>({id:1,url}),query:async()=>[],sendMessage:async(_id,r)=>{sends.push(r);if(r.type==='PAIA_PROMPT_NEXT_PROBE')return {authorization:(await commands.authorization()).generation,binding,nonce,idle:true};return result;}}};
 const commands=new NextPromptCommands(service,api,{isIdle:async()=>true}),top={id:'extension',url,tab:{id:1},frameId:0,documentId:'host-doc'},popup={id:'extension',url:api.runtime.getURL('ui/popup.html')},frame={id:'extension',url:api.runtime.getURL('ui/prompt-surface.html')+'#next-'+nonce,tab:{id:1},frameId:3};
 await commands.handle({type:'PAIA_PROMPT_NEXT_CONFIGURE',enabled:true},popup);
 const offer=async(text='Next, ask me to explain sorting.')=>commands.handle({type:'PAIA_PROMPT_NEXT_OFFER',binding:{...binding},authorization:(await commands.authorization()).generation,snapshot:{completed:true,text,blocks:1,excluded:false}},top);
 const rpc=command=>commands.handle({type:'PAIA_PROMPT_NEXT_RPC',nonce,command},frame);
 return {...f,service,commands,api,sends,stored,offer,rpc,warm:()=>service.query(),replaceReply:()=>{binding={...binding,revision:binding.revision+1};},failInsert:()=>{result={status:'failed'};}};
}
test('actual warm Family offers exact original text, bounded identity and verified native dispatch without retaining reply',async()=>{
 const f=await fixture();assert.equal((await f.offer()).available,false);await f.warm();assert.equal((await f.offer()).available,true);
 const view=await f.rpc({type:'get'});assert.equal(view.type,'PROMPT_FAMILY_MATCH');assert.equal(view.sourceType,'PROMPT_FAMILY');assert.equal(view.choices[0].text,'Explain sorting');
 const group=f.commands.groups.get(1);assert.equal(group.family.text,'Explain sorting');assert.equal(JSON.stringify([...f.commands.groups.values()]).includes('Next, ask me'),false);assert.equal(JSON.stringify(f.stored).includes('sorting'),false);
 const result=await f.rpc({type:'insert',id:view.choices[0].id,operationId:crypto.randomUUID()});assert.equal(result.verified,true);assert.equal(f.sends.find(r=>r.type==='PAIA_PROMPT_NEXT_INSERT').text,'Explain sorting');assert.equal(f.requests.length,0);
});
test('authoritative Direct never waits for Family and ambiguous Choice honestly defers without consulting it',async()=>{const f=await fixture();f.service.nextFamilyView=()=>{throw Error('Family path must not be touched');};assert.equal((await f.offer('回复“已登录”。')).available,true);assert.notEqual((await f.rpc({type:'get'})).type,'PROMPT_FAMILY_MATCH');assert.deepEqual(await f.offer('请选择：继续/停止。'),{available:false,reason:'AMBIGUOUS_QUICK_CHOICE'});assert.equal(f.commands.groups.size,0);assert.equal(f.sends.some(x=>x.type==='PAIA_PROMPT_NEXT_INSERT'),false);});
for(const action of ['edit','hide','purge'])test('actual '+action+' invalidates Family get/reopen/copy/insert before dispatch',async()=>{
 const f=await fixture(),q=await f.warm();await f.offer();const v=await f.rpc({type:'get'});f.failInsert();await f.rpc({type:'insert',id:v.choices[0].id,operationId:crypto.randomUUID()});
 if(action==='purge')for(const row of await rows(f.s,'records'))await f.s.permanentDelete(row.id);else await new PromptReuseService(f.s).change({action,id:q.items[0].id,revision:q.revision,...(action==='edit'?{text:'Explain graphs'}:{})});
 const before=f.sends.filter(x=>x.type==='PAIA_PROMPT_NEXT_INSERT').length;
 for(const command of [{type:'get'},{type:'copy',id:v.choices[0].id},{type:'insert',id:v.choices[0].id,operationId:crypto.randomUUID()}])await assert.rejects(()=>f.rpc(command));
 await assert.rejects(()=>f.commands.card({type:'next_reopen'},{id:1}));assert.equal(f.sends.filter(x=>x.type==='PAIA_PROMPT_NEXT_INSERT').length,before);
});
for(const change of ['revoke','reply'])test('held real resolve cannot release Family after '+change,async()=>{
 const f=await fixture();await f.warm();await f.offer();const started=deferred(),held=deferred(),resolve=f.service.resolve.bind(f.service);
 f.service.resolve=async value=>{const selected=await resolve(value);started.resolve();await held.promise;return selected;};
 const task=f.rpc({type:'get'});await started.promise;if(change==='revoke')await f.commands.configure(false);else f.replaceReply();held.resolve();await assert.rejects(task);assert.equal(f.sends.some(x=>x.type==='PAIA_PROMPT_NEXT_INSERT'),false);
});
test('generation change while real warm view qualification is pending rejects old offer',async()=>{
 const f=await fixture(),q=await f.warm(),started=deferred(),held=deferred(),read=f.service.nextFamilyView.bind(f.service);f.service.nextFamilyView=async()=>{const view=await read();started.resolve();await held.promise;return view;};
 const pending=f.offer();await started.promise;await new PromptReuseService(f.s).change({action:'hide',id:q.items[0].id,revision:q.revision});held.resolve();await assert.rejects(pending);assert.equal(f.commands.groups.size,0);
});
test('Family final content qualification refuses hide during real idle await',async()=>{
 const f=await fixture(),q=await f.warm(),offered=await f.offer(),started=deferred(),held=deferred();
 f.commands.surface.isIdle=async()=>{started.resolve();return held.promise;};
 const pending=f.commands.handle({type:'PAIA_PROMPT_NEXT_PRESENT',id:offered.id},{id:'extension',url,tab:{id:1},frameId:0,documentId:'host-doc'});
 await started.promise;await new PromptReuseService(f.s).change({action:'hide',id:q.items[0].id,revision:q.revision});held.resolve(true);await assert.rejects(pending);assert.equal(f.sends.some(x=>x.type==='PAIA_PROMPT_NEXT_INSERT'),false);
});
test('Family generation is checked after the final authorization await',async()=>{
 const f=await fixture(),q=await f.warm();await f.offer();const started=deferred(),held=deferred(),authorize=f.commands.authorization.bind(f.commands);let calls=0;
 f.commands.authorization=async()=>{const a=await authorize();if(++calls===3){started.resolve();await held.promise;}return a;};
 const pending=f.commands.assertCurrent(f.commands.groups.get(1));await started.promise;await new PromptReuseService(f.s).change({action:'hide',id:q.items[0].id,revision:q.revision});held.resolve();await assert.rejects(pending);
});
test('actual content insert handshake checks Family after STATUS yields, before editing composer',async()=>{
 const {readFile}=await import('node:fs/promises'),vm=await import('node:vm'),source=await readFile(new URL('../content/prompt-next.js',import.meta.url),'utf8');
 const start=source.indexOf("  if(r.type==='PAIA_PROMPT_NEXT_INSERT'){");const body=source.slice(start,source.indexOf('\n };',start));
 const started=deferred(),held=deferred(),done=deferred();let eligible=true,edits=0;
 const context={epoch:1,authorization:'auth',candidate:'candidate',binding:{url},inserting:false,same:(a,b)=>JSON.stringify(a)===JSON.stringify(b),scan(){},replyMutation:()=>false,observer:{takeRecords:()=>[]},rpc:async type=>{if(type==='STATUS'){started.resolve();await held.promise;return {enabled:true,generation:'auth'};}if(type==='INSERT_CURRENT'){if(!eligible)throw Error('stale');return {current:true};}throw Error(type);},composer:{insert:async()=>{edits++;return {status:'inserted',verified:true};}}};
 vm.default.createContext(context);const handle=vm.default.runInContext('(r,s,reply)=>{'+body+'}',context);
 handle({type:'PAIA_PROMPT_NEXT_INSERT',sourceType:'PROMPT_FAMILY',id:'candidate',text:'Explain sorting',operationId:'synthetic',authorization:'auth',binding:{url}},null,done.resolve);
 await started.promise;eligible=false;held.resolve();const result=await done.promise;assert.equal(edits,0);assert.equal(result.status,'failed');
});
for(const action of ['edit','hide','purge'])test('stale Family '+action+' still permits bound dismissal without copy or insertion authority',async()=>{
 const f=await fixture(),q=await f.warm();await f.offer();const view=await f.rpc({type:'get'});
 if(action==='purge')for(const row of await rows(f.s,'records'))await f.s.permanentDelete(row.id);else await f.service.change({action,id:q.items[0].id,revision:q.revision,...(action==='edit'?{text:'Explain graphs'}:{})});
 await f.rpc({type:'hide'});assert.equal(f.sends.filter(x=>x.type==='PAIA_PROMPT_NEXT_HIDE').length,1);
 for(const command of [{type:'get'},{type:'copy',id:view.choices[0].id},{type:'insert',id:view.choices[0].id,operationId:crypto.randomUUID()}])await assert.rejects(()=>f.rpc(command));
 assert.equal(f.sends.some(x=>x.type==='PAIA_PROMPT_NEXT_INSERT'),false);
});
for(const boundary of ['nonce','frame','document','authorization','reply','extra'])test('dismissal retains exact '+boundary+' binding',async()=>{
 const f=await fixture();await f.warm();await f.offer();
 const sender={id:'extension',url:f.api.runtime.getURL('ui/prompt-surface.html')+'#next-'+nonce,tab:{id:1},frameId:3},request={type:'PAIA_PROMPT_NEXT_RPC',nonce,command:{type:'hide'}};
 if(boundary==='nonce'){request.nonce=crypto.randomUUID();sender.url=f.api.runtime.getURL('ui/prompt-surface.html')+'#next-'+request.nonce;}
 if(boundary==='frame')sender.frameId=0;
 if(boundary==='document')f.api.tabs.get=async()=>({id:1,url:url+'-different'});
 if(boundary==='authorization')await f.commands.configure(false);
 if(boundary==='reply')f.replaceReply();
 if(boundary==='extra')request.command.extra=true;
 await assert.rejects(()=>f.commands.handle(request,sender));assert.equal(f.sends.some(x=>x.type==='PAIA_PROMPT_NEXT_HIDE'),false);
});


// R3 click is busy; display-idle is not insertion qualification.
async function contentFamilyInsert(f,{beforeCurrent=async()=>{},alterRequest=x=>x}={}){
 const {readFile}=await import('node:fs/promises'),vm=await import('node:vm');
 const source=await readFile(new URL('../content/prompt-next.js',import.meta.url),'utf8');
 const start=source.indexOf("  if(r.type==='PAIA_PROMPT_NEXT_INSERT'){");
 const body=source.slice(start,source.indexOf('\n };',start)),g=f.commands.groups.get(1);let edits=0,draft='FAMILY_DRAFT',requests=[];
 const top={id:'extension',url,tab:{id:1},frameId:0,documentId:'host-doc'};
 const context={epoch:1,authorization:g.authorization,candidate:g.id,binding:g.binding,inserting:false,same:(a,b)=>JSON.stringify(a)===JSON.stringify(b),scan(){},replyMutation:()=>false,observer:{takeRecords:()=>[]},rpc:async(type,fields={})=>{if(type==='PRESENT'||type==='INSERT_CURRENT')await beforeCurrent();const request=alterRequest({type:'PAIA_PROMPT_NEXT_'+type,...fields});requests.push(request);return f.commands.handle(request,top);},composer:{insert:async request=>{assert.equal(request.guard(),true);edits++;draft+=request.text;return {status:'inserted',verified:true};}}};
 vm.default.createContext(context);const handle=vm.default.runInContext('(r,s,reply)=>{'+body+'}',context),send=f.api.tabs.sendMessage;
 f.api.tabs.sendMessage=(id,r,...args)=>r.type==='PAIA_PROMPT_NEXT_INSERT'?new Promise(resolve=>handle(r,null,resolve)):send(id,r,...args);
 return {edits:()=>edits,draft:()=>draft,requests,top};
}
test('R3 actual Family owner plus content inserts once while original surface is intentionally busy',async()=>{
 const f=await fixture();await f.warm();await f.offer();const c=await contentFamilyInsert(f),view=await f.commands.card({type:'next_current'},{id:1});
 f.commands.surface.isIdle=async()=>false;
 const result=await f.commands.card({type:'next_insert',id:view.result.id,operationId:crypto.randomUUID(),conditionPresented:true},{id:1});
 assert.deepEqual(result,{status:'inserted',verified:true});assert.equal(c.edits(),1);assert.equal(c.draft(),'FAMILY_DRAFTExplain sorting');assert.equal(f.requests.length,0);
});
for(const boundary of ['operation','choice','group','extra','revoke','reply','edit','hide','purge','replacement'])test('busy Family click rejects '+boundary+' before its original native edit',async()=>{
 const f=await fixture(),q=await f.warm();await f.offer();const view=await f.commands.card({type:'next_current'},{id:1});let changed=false;
 const c=await contentFamilyInsert(f,{beforeCurrent:async()=>{if(changed)return;changed=true;if(boundary==='revoke')await f.commands.configure(false);if(boundary==='reply')f.replaceReply();if(boundary==='replacement')await f.offer();if(['edit','hide'].includes(boundary))await f.service.change({action:boundary,id:q.items[0].id,revision:q.revision,...(boundary==='edit'?{text:'Explain graphs'}:{})});if(boundary==='purge')for(const row of await rows(f.s,'records'))await f.s.permanentDelete(row.id);},alterRequest:request=>{if(request.type!=='PAIA_PROMPT_NEXT_INSERT_CURRENT')return request;return {...request,...(boundary==='operation'?{operationId:crypto.randomUUID()}:boundary==='choice'?{choiceId:crypto.randomUUID()}:boundary==='group'?{id:crypto.randomUUID()}:boundary==='extra'?{extra:true}:{})};}});
 f.commands.surface.isIdle=async()=>false;
 assert.deepEqual(await f.commands.card({type:'next_insert',id:view.result.id,operationId:crypto.randomUUID(),conditionPresented:true},{id:1}),{status:'failed',verified:false});assert.equal(c.edits(),0);assert.equal(c.draft(),'FAMILY_DRAFT');assert.equal(f.requests.length,0);
});
test('original accepted Family operation qualification is single-use and cannot be replayed after settlement',async()=>{
 const f=await fixture();await f.warm();await f.offer();const c=await contentFamilyInsert(f),view=await f.commands.card({type:'next_current'},{id:1});f.commands.surface.isIdle=async()=>false;
 assert.equal((await f.commands.card({type:'next_insert',id:view.result.id,operationId:crypto.randomUUID(),conditionPresented:true},{id:1})).verified,true);
 const request=c.requests.find(x=>x.type==='PAIA_PROMPT_NEXT_INSERT_CURRENT');assert.ok(request);await assert.rejects(()=>f.commands.handle(request,c.top));assert.equal(c.edits(),1);
 await assert.rejects(()=>f.commands.card({type:'next_insert',id:view.result.id,operationId:request.operationId,conditionPresented:true},{id:1}));assert.equal(c.edits(),1);
});
test('original legacy Family dispatch retains real same-operation requalification',async()=>{
 const f=await fixture();await f.warm();await f.offer();const c=await contentFamilyInsert(f),view=await f.rpc({type:'get'});f.commands.surface.isIdle=async()=>false;
 assert.deepEqual(await f.rpc({type:'insert',id:view.choices[0].id,operationId:crypto.randomUUID()}),{status:'inserted',verified:true});assert.equal(c.edits(),1);assert.equal(c.draft(),'FAMILY_DRAFTExplain sorting');
});
test('content cannot register a Family insertion merely by reporting an operation and choice',async()=>{
 const f=await fixture();await f.warm();const offered=await f.offer(),g=f.commands.groups.get(1);await assert.rejects(()=>f.commands.handle({type:'PAIA_PROMPT_NEXT_INSERT_CURRENT',id:offered.id,operationId:crypto.randomUUID(),choiceId:g.choices[0].id},{id:'extension',url,tab:{id:1},frameId:0,documentId:'host-doc'}));assert.equal(g.attempted.size,0);assert.equal(f.sends.some(x=>x.type==='PAIA_PROMPT_NEXT_INSERT'),false);
});
for(const boundary of ['revoke','reply','replacement'])test('held same-operation Family qualification rejects final '+boundary+' after its original resolve await',async()=>{
 const f=await fixture();await f.warm();await f.offer();const view=await f.commands.card({type:'next_current'},{id:1}),started=deferred(),held=deferred();let armed=false;
 const resolve=f.service.resolve.bind(f.service);f.service.resolve=async value=>{const result=await resolve(value);if(armed){armed=false;started.resolve();await held.promise;}return result;};
 const c=await contentFamilyInsert(f,{beforeCurrent:async()=>{armed=true;}});f.commands.surface.isIdle=async()=>false;
 const task=f.commands.card({type:'next_insert',id:view.result.id,operationId:crypto.randomUUID(),conditionPresented:true},{id:1});await started.promise;
 if(boundary==='revoke')await f.commands.configure(false);if(boundary==='reply')f.replaceReply();if(boundary==='replacement')await f.offer();held.resolve();
 assert.deepEqual(await task,{status:'failed',verified:false});assert.equal(c.edits(),0);assert.equal(c.draft(),'FAMILY_DRAFT');
});
test('late qualification after original two-second UNKNOWN cannot revive an expired native insertion',async()=>{
 const f=await fixture();await f.warm();await f.offer();const view=await f.commands.card({type:'next_current'},{id:1}),started=deferred(),held=deferred();let armed=false;
 const resolve=f.service.resolve.bind(f.service);f.service.resolve=async value=>{const result=await resolve(value);if(armed){armed=false;started.resolve();await held.promise;}return result;};
 const c=await contentFamilyInsert(f,{beforeCurrent:async()=>{armed=true;}});f.commands.surface.isIdle=async()=>false;
 const task=f.commands.card({type:'next_insert',id:view.result.id,operationId:crypto.randomUUID(),conditionPresented:true},{id:1});await started.promise;assert.deepEqual(await task,{status:'uncertain',verified:false});held.resolve();await new Promise(resolve=>setTimeout(resolve,20));assert.equal(c.edits(),0);assert.equal(c.draft(),'FAMILY_DRAFT');assert.equal(f.commands.groups.get(1).attempted.size,1);
});
