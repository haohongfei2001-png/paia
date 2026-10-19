import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../ui/prompt-surface.js',import.meta.url),'utf8');
// Exercise the original private functions, including the real insertion
// completion and form RPC ownership, with deterministic timer/RPC boundaries.
const section=(from,to)=>{const start=source.indexOf(from),end=source.indexOf(to,start);assert.ok(start>=0&&end>start);return source.slice(start,end);};
function fixture({status='inserted'}={}){
 const item={id:'synthetic-local',text:'F09 synthetic reuse'},row={dataset:{}},original={id:'row-insert',dataset:{},disabled:false,closest:()=>row,focus(){}},use={id:'capsule-use',dataset:{},disabled:false},text={textContent:''},controls=[original,use],timers=[],calls=[];
 let releaseForm,items=[item];const document={documentElement:{dataset:{surfaceForm:'board'}},getElementById:id=>id==='capsule-use'?use:id==='capsule-text'?text:null,querySelectorAll:()=>controls,hasFocus:()=>false};
 const list={querySelector:()=>original};
 const scope={document,list,searchInput:{},quickPromptEligible:()=>true,session:{current:()=>items},localize:x=>x,crypto:globalThis.crypto,setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},tell(){},leaveCheck(){},selectionRef:()=>({kind:'manual_reuse',id:item.id}),button:()=>({}),copyWhole(){},status:{append(){}},rpc:async command=>{calls.push(command);if(command.type==='surface_form')return new Promise(resolve=>releaseForm=()=>resolve({form:command.form}));return {status,verified:status==='inserted'};}};
 const declarations='let busy=false,refreshing=false,editing=false,checking=null,drag=false,composing=false,searchComposing=false,mode="candidates",automaticSuggestion=false,assistSurface=null,candidateTarget={};const attempted=new Set();const currentItems=()=>session.current();';
 const code=declarations+section('function pending(value)','\nlet feedbackTimer')+section(source.includes('function setPendingEligibility(')?'function setPendingEligibility(':'function paintCapsule()','\nfunction clipped(')+section('async function insert(item,b,','\nfunction edit(')+'\nreturn {insert,setSurfaceForm,paintCapsule,pending,busy:()=>busy,attempted:()=>attempted.has("synthetic-local")};';
 const owner=new Function(...Object.keys(scope),code)(...Object.values(scope));
 return {owner,item,original,use,timers,calls,setItems:value=>{items=value;},releaseForm:()=>releaseForm(),async complete(){await owner.insert(item,original);assert.equal(calls.filter(x=>x.type==='PAIA_PROMPT_SELECTION_INSERT').length,1);assert.equal(timers.length,1);assert.equal(timers[0].ms,480);assert.equal(original.disabled,true);},tick(){timers.shift().fn();}};
}
test('feedback expiry during an original form RPC stays disabled then restores row and capsule eligibility',async()=>{
 const f=fixture();await f.complete();const changing=f.owner.setSurfaceForm('capsule');assert.equal(f.owner.busy(),true);assert.equal(f.original.dataset.pendingDisabled,'1');assert.equal(f.use.dataset.pendingDisabled,'1');
 f.tick();assert.equal(f.owner.attempted(),false);assert.equal(f.original.disabled,true,'completion must not enable a control while another original RPC owns pending');assert.equal(f.use.disabled,true);
 f.releaseForm();await changing;assert.equal(f.original.disabled,false,'pending ACK must not restore the expired attempt lock');assert.equal(f.use.disabled,false);assert.equal(Object.hasOwn(f.original.dataset,'pendingDisabled'),false);assert.equal(f.calls.length,2,'no replay, refresh or extra request');
});
test('feedback expiry after form ACK restores both original controls normally',async()=>{const f=fixture();await f.complete();const changing=f.owner.setSurfaceForm('capsule');f.releaseForm();await changing;assert.equal(f.original.disabled,true);f.tick();assert.equal(f.original.disabled,false);assert.equal(f.use.disabled,false);assert.equal(f.calls.length,2);});
test('a removed original item cannot regain insertion eligibility when feedback expires during form pending',async()=>{const f=fixture();await f.complete();const changing=f.owner.setSurfaceForm('capsule');f.setItems([]);f.tick();f.releaseForm();await changing;assert.equal(f.original.disabled,true);assert.equal(f.use.disabled,true);assert.equal(f.calls.length,2);});
test('changed text keeps the old row disabled and permits only the separately current capsule value',async()=>{const f=fixture();await f.complete();const changing=f.owner.setSurfaceForm('capsule');f.setItems([{...f.item,text:'changed current text'}]);f.tick();f.releaseForm();await changing;assert.equal(f.original.disabled,true);assert.equal(f.use.disabled,false);assert.equal(f.calls.length,2);});

test('a completed verified attempt does not become permanently disabled after a later form ACK',async()=>{const f=fixture();await f.complete();const changing=f.owner.setSurfaceForm('capsule');f.tick();f.releaseForm();await changing;assert.equal(f.original.disabled,false);assert.equal(f.use.disabled,false);assert.equal(f.calls.length,2);});
test('hidden original text never regains row or capsule eligibility',async()=>{const f=fixture();await f.complete();const changing=f.owner.setSurfaceForm('capsule');f.setItems([{...f.item,hidden:true}]);f.tick();f.releaseForm();await changing;assert.equal(f.original.disabled,true);assert.equal(f.use.disabled,true);assert.equal(f.calls.length,2);});
test('UNKNOWN insertion has no success timer and cannot regain an automatic attempt',async()=>{const f=fixture({status:'uncertain'});await f.owner.insert(f.item,f.original);assert.equal(f.timers.length,0);assert.equal(f.owner.attempted(),true);const changing=f.owner.setSurfaceForm('capsule');f.releaseForm();await changing;assert.equal(f.original.disabled,true);assert.equal(f.use.disabled,true);await f.owner.insert(f.item,f.original);assert.equal(f.calls.filter(x=>x.type==='PAIA_PROMPT_SELECTION_INSERT').length,1);});

test('hidden original item remains locked when feedback expires without another pending RPC',async()=>{const f=fixture();await f.complete();f.setItems([{...f.item,hidden:true}]);f.tick();assert.equal(f.original.disabled,true);assert.equal(f.use.disabled,true);assert.equal(f.calls.length,1);});
