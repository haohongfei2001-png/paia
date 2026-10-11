import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {PROMPT_REUSE_ROW} from '../core/prompt-reuse-preferences.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
const source=await readFile(new URL('../ui/prompt-surface.js',import.meta.url),'utf8'),orderFunction=source.slice(source.indexOf('function order('),source.indexOf('\n// Presentation helpers'));
const controls=source.slice(source.indexOf('const pinned=items.filter'),source.indexOf('   tools.append(dragHandle'));
const representative=source.slice(source.indexOf('function invalidateRepresentative('),source.indexOf('async function split('));
class Node {
 constructor(){this.children=[];this.style={};this.scrollHeight=44;this.dataset={};this.handlers={};this.disabled=false;}
 append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=[...nodes];}addEventListener(kind,fn){this.handlers[kind]=fn;}focus(){this.focused=true;}
 querySelector(){for(const child of this.children){if(child.type==='radio')return child;const nested=child.querySelector?.();if(nested)return nested;}return null;}
}
const sameAuthority=async s=>Object.fromEntries(await Promise.all(['records','recordIndex','blocks','inputStates','documents','revisions','tombstones'].map(async name=>[name,await rows(s,name)])));
async function fixture(){const f=await completeFixture({texts:['SYNTHETIC representative expression','SYNTHETIC representative expression ','SYNTHETIC other useful expression','SYNTHETIC other useful expression']});await f.s.finishFoundation();return {...f,service:new PromptReuseService(f.s)};}
function chooser(item,read){const editor=new Node(),effects=[],state={busy:false,drag:null,editing:false,checking:null,composing:false,disposed:false,epoch:0,representativeChoice:null,editor,list:{hidden:false},document:{createElement:()=>new Node(),createTextNode:text=>({text})},parkEditor(){},bindCopy:(n,text)=>{n.text=text;},button:(label,fn)=>Object.assign(new Node(),{label,fn}),rpc:read,currentItems:()=>[item],manage:(...args)=>effects.push(args),refresh:async()=>{},scheduleLayout(){}};const context=vm.createContext(state);vm.runInContext(representative,context);state.item=item;return {state,effects,context,run:()=>vm.runInContext('chooseRepresentative(item)',context),invalidate:()=>vm.runInContext('++epoch;invalidateRepresentative()',context)};}
test('representative selection uses actual original members, keeps edited text priority and never edits Source/Working',async()=>{
 const f=await fixture(),q=await f.service.query(),family=q.items.find(x=>x.text.startsWith('SYNTHETIC representative')),members=await f.service.members(family.id),member=members.find(x=>x.text!==family.text),before=await sameAuthority(f.s);
 assert.ok(member);await f.service.change({action:'representative',id:family.id,revision:q.revision,representative:member.id});assert.equal((await f.service.query()).items.find(x=>x.id===family.id).text,member.text);assert.deepEqual(await sameAuthority(f.s),before);
 let next=await f.service.query();await f.service.change({action:'edit',id:family.id,revision:next.revision,text:'SYNTHETIC exact independently authored override'});next=await f.service.query();await f.service.change({action:'representative',id:family.id,revision:next.revision,representative:members.find(x=>x.id!==member.id).id});assert.equal((await f.service.query()).items.find(x=>x.id===family.id).text,'SYNTHETIC exact independently authored override');assert.deepEqual(await sameAuthority(f.s),before);
 const old=next.revision;await assert.rejects(f.service.change({action:'representative',id:family.id,revision:old,representative:'unknown'}),e=>e.code==='MEMORY_STALE');
});
test('original selector cancellation and invalidation fence late original member bodies',async()=>{
 const f=await fixture(),family=(await f.service.query()).items[0],members=await f.service.members(family.id);
 for(const cancel of [true,false]){let release;const x=chooser(family,()=>new Promise(resolve=>{release=resolve;})),pending=x.run(),choice=x.state.representativeChoice;
  if(cancel)x.state.editor.children.at(-1).children[1].fn();else x.invalidate();release(members);await pending;
  assert.equal(choice.members.children.length,0);assert.equal(choice.save.disabled,true);assert.deepEqual(x.effects,[]);assert.equal(x.state.editing,!cancel);
 }
});
test('actual same-width selector sends the stable original member ID through the original representative action',async()=>{
 const f=await fixture(),family=(await f.service.query()).items[0],members=await f.service.members(family.id),x=chooser(family,async()=>members);await x.run();const choice=x.state.representativeChoice,radio=choice.members.children[1].children[0];radio.checked=true;radio.handlers.change();assert.equal(choice.save.disabled,false);choice.save.fn();assert.equal(x.effects[0][0],'representative');assert.equal(x.effects[0][1],family);assert.equal(x.effects[0][2].representative,members[1].id);
 x.invalidate();choice.save.fn();assert.equal(x.effects.length,1);assert.equal(choice.save.disabled,true);assert.equal(choice.members.children.length,0);
});
test('pinned boundaries produce no original owner write, and hidden pins remain in complete order',async()=>{
 const f=await fixture();let q=await f.service.query();for(const item of q.items){await f.service.change({action:'pin',id:item.id,revision:q.revision});q=await f.service.query();}const ids=q.manualOrder;const hidden=ids[1];await f.service.change({action:'hide',id:hidden,revision:q.revision});q=await f.service.query();const item=q.items[0],calls=[],tools={append(...nodes){calls.push(...nodes);}},state={items:q.items,item,manualOrder:q.manualOrder,tools,button:(label,fn)=>({label,fn,dataset:{},disabled:false}),manage:()=>{throw Error('Boundary must not write');}};
 const context=vm.createContext(state);vm.runInContext(orderFunction+'\n'+controls,context);const before=await sameAuthority(f.s),prefs=await rows(f.s,'meta');assert.deepEqual(Array.from(vm.runInContext('order(item,item.id)',context)),q.manualOrder);assert.equal(calls[0].disabled,true);assert.equal(calls[1].disabled,true);calls[0].fn();calls[1].fn();assert.deepEqual(await rows(f.s,'meta'),prefs);assert.deepEqual(await sameAuthority(f.s),before);assert.ok(q.manualOrder.includes(hidden));
});

test('an original membership refusal clears unqualified member bodies even when notification is lost',async()=>{
 const f=await fixture();let q=await f.service.query();const id=q.items[0].id;await f.service.change({action:'edit',id,revision:q.revision,text:'SYNTHETIC independently authored work must survive'});q=await f.service.query();const item=q.items.find(x=>x.id===id),x=chooser(item,async()=>f.service.members(id));await x.run();const choice=x.state.representativeChoice,radio=choice.members.children[0].children[0];radio.checked=true;radio.handlers.change();const selected=choice.chosen,editor=x.state.editor;
 const input=await f.s.input(selected);await f.s.editDocument({operationId:crypto.randomUUID(),documentId:input.documentId,blocks:[{id:input.id,expectedRevision:input.revision,libraryText:input.libraryText,note:input.note,excluded:true}]});
 const all=()=>f.s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(f.s.repository.stores.map(async name=>[name,await t.all(name)])))),before=await all();let refusal;
 x.state.pending=v=>{x.state.busy=v;};x.state.tell=()=>{};x.state.focusRow=()=>{};x.state.change=async(action,id,extra)=>{try{return await f.service.change({action,id,revision:q.revision,...extra});}catch(error){refusal=error.code;throw error;}};
 vm.runInContext(source.slice(source.indexOf('async function manage('),source.indexOf('async function insert(')),x.context);await vm.runInContext("manage('representative',item,{representative:representativeChoice.chosen})",x.context);
 assert.equal(refusal,'INVALID_REQUEST');assert.equal(x.state.representativeChoice,choice);assert.equal(choice.chosen,selected);assert.equal(x.state.editor,editor);assert.equal(x.state.editing,true);assert.equal(choice.members.children.length,0);assert.equal(choice.save.disabled,true);assert.deepEqual(await all(),before);assert.equal((await f.service.query()).items.find(x=>x.id===id).text,'SYNTHETIC independently authored work must survive');
});

test('the original manual textarea and canonical work survive an actual original owner storage abort',async()=>{
 const f=await fixture(),created=await f.service.change({action:'create',revision:0,text:'SYNTHETIC existing independent manual work'}),q=await f.service.query(),item=q.items.find(x=>x.id===created.id),x=chooser(item,async()=>{throw Error('No member query');});x.state.list.querySelector=()=>null;x.state.list.querySelectorAll=()=>[];x.state.pending=v=>{x.state.busy=v;};x.state.tell=()=>{};x.state.change=(action,id,extra)=>f.service.change({action,id,revision:q.revision,...extra});
 vm.runInContext(source.slice(source.indexOf('function edit('),source.indexOf('function invalidateRepresentative(')),x.context);vm.runInContext('edit(item)',x.context);const area=x.state.editor.children[0].children[1];area.value='SYNTHETIC unsaved original manual draft 中文';const originalEditor=x.state.editor,originalArea=area,all=()=>f.s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(f.s.repository.stores.map(async name=>[name,await t.all(name)])))),before=await all(),transaction=f.s.repository.transaction.bind(f.s.repository);let aborts=0;
 f.s.repository.transaction=(write,fn,...args)=>transaction(write,async t=>{const put=t.put.bind(t);t.put=(name,row,...rest)=>{if(name==='meta'&&row.id===PROMPT_REUSE_ROW){aborts++;throw Error('SYNTHETIC original preference write abort');}return put(name,row,...rest);};return fn(t);},...args);
 try{await x.state.editor.children[1].children[0].fn();}finally{f.s.repository.transaction=transaction;}
 assert.equal(aborts,1);assert.equal(x.state.editing,true);assert.equal(x.state.editor,originalEditor);assert.equal(x.state.editor.hidden,false);assert.equal(x.state.editor.children[0].children[1],originalArea);assert.equal(area.value,'SYNTHETIC unsaved original manual draft 中文');assert.deepEqual(await all(),before);assert.equal((await f.service.query()).items.find(x=>x.id===item.id).text,item.text);
});
