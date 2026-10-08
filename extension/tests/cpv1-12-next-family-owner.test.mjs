import test from 'node:test';import assert from 'node:assert/strict';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {NextPromptCommands} from '../background/prompt-next.js';
const url='https://chatgpt.com/c/family-owner',nonce='11111111-1111-4111-8111-111111111111';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function fixture(){
 const f=await completeFixture({texts:['Explain sorting','Explain sorting']}),service=new PromptReuseService(f.s),stored={},sends=[];
 let binding={url,conversation:'/c/family-owner',cycle:1,replyId:'reply-1',revision:0},result={status:'inserted',verified:true};
 const api={runtime:{id:'extension',getURL:p=>'chrome-extension://extension/'+p,sendMessage:async()=>{}},storage:{session:{get:async()=>({...stored}),set:async x=>Object.assign(stored,x)}},tabs:{get:async()=>({id:1,url}),query:async()=>[],sendMessage:async(_id,r)=>{sends.push(r);if(r.type==='PAIA_PROMPT_NEXT_PROBE')return {authorization:(await commands.authorization()).generation,binding,nonce,idle:true};return result;}}};
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
test('authoritative Direct and Choice never wait for unavailable or pending Family view',async()=>{const f=await fixture();f.service.nextFamilyView=()=>{throw Error('Family path must not be touched');};for(const text of ['登录完成后告诉我“已登录”。','请选择：继续/停止。']){assert.equal((await f.offer(text)).available,true);assert.notEqual((await f.rpc({type:'get'})).type,'PROMPT_FAMILY_MATCH');}});
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
 const context={epoch:1,authorization:'auth',candidate:'candidate',binding:{url},inserting:false,same:(a,b)=>JSON.stringify(a)===JSON.stringify(b),scan(){},replyMutation:()=>false,observer:{takeRecords:()=>[]},rpc:async type=>{if(type==='STATUS'){started.resolve();await held.promise;return {enabled:true,generation:'auth'};}if(type==='PRESENT'){if(!eligible)throw Error('stale');return {safe:true};}throw Error(type);},composer:{insert:async()=>{edits++;return {status:'inserted',verified:true};}}};
 vm.default.createContext(context);const handle=vm.default.runInContext('(r,s,reply)=>{'+body+'}',context);
 handle({type:'PAIA_PROMPT_NEXT_INSERT',sourceType:'PROMPT_FAMILY',id:'candidate',text:'Explain sorting',operationId:'synthetic',authorization:'auth',binding:{url}},null,done.resolve);
 await started.promise;eligible=false;held.resolve();const result=await done.promise;assert.equal(edits,0);assert.equal(result.status,'failed');
});
