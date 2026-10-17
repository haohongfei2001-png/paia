import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const path=new URL('../ui/revisit.js',import.meta.url);
const source=readFileSync(path,'utf8').replace(/^import .*;\n/gm,'').replace('export const revisitPage=','const revisitPage=').replace('export function installRevisit(','function installRevisit(')+'\nglobalThis.owner={revisitPage,installRevisit};';
const ticks=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
async function fixture(){
 const nodes=new Map(),listeners=new Map(),messages=[],microtasks=[],calls=[];let policy=false,holdType=null,held=null,holdConfigure=false,configureRelease,failConfigure=false,cards=[{id:'input',documentId:'document',title:'Synthetic private card',snippet:'SYNTHETIC OLD PRIVATE MATERIAL',sourceSentAt:'2021-01-01T00:00:00Z'}];
 class Node {constructor(tag='',className='',text=''){this.tag=tag;this.className=className;this.textContent=text;this.children=[];this.checked=false;this.disabled=false;this.hidden=false;this.dataset={};}set id(v){this._id=v;nodes.set(v,this);}get id(){return this._id;}get childNodes(){return this.children;}append(...xs){this.children.push(...xs);for(const x of xs)x.parentElement=this;}replaceChildren(...xs){this.children=[];this.append(...xs);}setAttribute(){}after(){}focus(){}addEventListener(){} }
 const element=(...args)=>new Node(...args),workspace=element();for(const id of ['workspace-heading']){const n=element();n.id=id;}
 const document={documentElement:{lang:'zh-CN'},getElementById:id=>nodes.get(id)||null,querySelector:s=>s==='.workspace'?workspace:null,createElement:tag=>element(tag),addEventListener:(type,fn)=>{if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);},dispatchEvent:event=>{for(const fn of listeners.get(event.type)||[])fn(event);},activeElement:null};
 const policyData=()=>({revisit:{oldContent:policy,exclusions:[]},capture:{excludedChats:[]}}),statusData=()=>({oldContent:policy,newInputs:{items:[]},topicUpdates:[],resurface:policy?structuredClone(cards):[]});
 const request=async(type,fields)=>{calls.push({type,fields});let result;if(type==='PAIA_READER_POLICY')result=policyData();else if(type==='PAIA_REVISIT_OPEN')result={id:'window'};else if(type==='PAIA_REVISIT_STATUS')result=statusData();else if(type==='PAIA_READER_RECENT')result=[];else if(type==='PAIA_REVISIT_CLOSE')result={};else if(type==='PAIA_READER_CONFIGURE'){if(holdConfigure)await new Promise(resolve=>configureRelease=resolve);if(failConfigure){failConfigure=false;throw Error('SYNTHETIC_CONFIGURE_FAILED');}policy=fields.change.oldContent;result={};}else throw Error('unexpected '+type);if(holdType===type){holdType=null;const wait={type,result};await new Promise(resolve=>{wait.release=resolve;held=wait;});if(wait.fail)throw Error('SYNTHETIC_POLICY_READ_FAILED');}return result;};
 const context={document,element,request,setIconLabel(){},requestNavigation(){},copy:zh=>zh,confirmReaderAction:async()=>true,history:{state:{},replaceState(state){this.state=state;}},location:{href:'synthetic://revisit'},Event,chrome:{runtime:{onMessage:{addListener:fn=>messages.push(fn)}}},queueMicrotask:fn=>microtasks.push(fn)};vm.createContext(context);vm.runInContext(source,context);context.owner.installRevisit();for(const fn of microtasks)fn();await ticks();
 return {context,nodes,calls,owner:context.owner,toggle:nodes.get('revisit-old-toggle'),hold(type){holdType=type;},held:()=>held,release(){held?.release();},rejectHeld(){held.fail=true;held.release();},holdSave(){holdConfigure=true;},releaseSave(){configureRelease?.();},policy:()=>policy,failSave(){failConfigure=true;},externalPolicy(value){policy=value;},clearCards(){cards=[];},emit(type,fields={}){for(const fn of messages)fn({type,...fields});},event(type){document.dispatchEvent(new Event(type));},body:()=>nodes.get('revisit-body'),text(node=nodes.get('revisit-body')){return node.textContent+node.children.map(child=>this.text(child)).join('');}};
}

for(const desired of [true,false])for(const type of ['PAIA_REVISIT_STATUS','PAIA_READER_POLICY'])for(const phase of ['before ACK','after ACK'])test(`held ${type} cannot overwrite ${desired} ${phase}`,async()=>{
 const f=await fixture();if(!desired){f.toggle.checked=true;await f.toggle.onchange();await ticks();assert.equal(f.policy(),true);}
 f.hold(type);const opening=f.owner.revisitPage.show();await ticks();assert.equal(f.held()?.type,type);if(type==='PAIA_READER_POLICY')await opening;
 f.holdSave();f.toggle.checked=desired;const saving=f.toggle.onchange();await ticks();assert.equal(f.toggle.disabled,true);assert.equal(f.calls.filter(x=>x.type==='PAIA_READER_CONFIGURE').at(-1).fields.change.oldContent,desired);
 try{if(phase==='before ACK'){f.release();await opening;await ticks();assert.equal(f.toggle.checked,desired,'a pre-intent response cannot repaint the native choice while its save is pending');f.releaseSave();await saving;}else{f.releaseSave();await saving;assert.equal(f.toggle.checked,desired);f.release();await opening;await ticks();assert.equal(f.toggle.checked,desired,'a pre-intent response cannot repaint the acknowledged native choice');}assert.equal(f.policy(),desired);}
 finally{f.release();f.releaseSave();await opening;await saving;}
});

for(const desired of [true,false])test(`failed explicit ${desired} retains exact prior choice and never retries the write`,async()=>{
 const f=await fixture();if(!desired){f.toggle.checked=true;await f.toggle.onchange();}await f.owner.revisitPage.show();f.failSave();f.holdSave();const initialWrites=f.calls.filter(x=>x.type==='PAIA_READER_CONFIGURE').length;
 f.toggle.checked=desired;const saving=f.toggle.onchange();await ticks();assert.equal(f.toggle.checked,desired);f.releaseSave();await saving;await ticks();assert.equal(f.toggle.checked,!desired);assert.equal(f.policy(),!desired);assert.equal(f.toggle.disabled,false);assert.match(f.nodes.get('revisit-status').textContent,/设置尚未保存/);assert.equal(f.calls.filter(x=>x.type==='PAIA_READER_CONFIGURE').length,initialWrites+1);
});
test('failed toggle restores prior native state even when an earlier status snapshot disagrees',async()=>{
 const f=await fixture();await f.owner.revisitPage.show();assert.equal(f.toggle.checked,false);f.externalPolicy(true);f.event('paia:revisit-opened');await ticks();assert.equal(f.toggle.checked,true);f.failSave();f.toggle.checked=false;await f.toggle.onchange();assert.equal(f.policy(),true);assert.equal(f.toggle.checked,true,'rollback uses the actual immediately preceding checked state, not a stale status snapshot');
});
test('pending opt-out suppresses reads and late original preview; ACK never revives old private cards',async()=>{
 const f=await fixture();f.toggle.checked=true;await f.toggle.onchange();await f.owner.revisitPage.show();assert.match(f.text(),/SYNTHETIC OLD PRIVATE MATERIAL/);
 f.hold('PAIA_REVISIT_STATUS');const old=f.owner.revisitPage.refresh();await ticks();f.holdSave();f.toggle.checked=false;const saving=f.toggle.onchange();await ticks();assert.equal(f.body().children.length,0,'opt-out clears private cards immediately');
 const count=f.calls.length;await f.owner.revisitPage.refresh();f.event('paia:revisit-opened');f.event('paia:reader-policy');f.emit('ARCHIVE_CHANGED',{cause:'CAPTURE'});await ticks();assert.equal(f.calls.length,count,'pending mutation cannot dispatch old-policy reads');
 f.release();await old;assert.equal(f.toggle.checked,false);assert.equal(f.body().children.length,0);f.releaseSave();await saving;await ticks();assert.doesNotMatch(f.text(),/SYNTHETIC OLD PRIVATE MATERIAL/);assert.equal(f.policy(),false);
});
for(const boundary of ['leave','purge'])test(`pending opt-in and late original status cannot revive cards across ${boundary}`,async()=>{
 const f=await fixture();f.hold('PAIA_REVISIT_STATUS');const old=f.owner.revisitPage.show();await ticks();f.holdSave();f.toggle.checked=true;const saving=f.toggle.onchange();await ticks();if(boundary==='leave')await f.owner.revisitPage.leave();else{f.clearCards();f.emit('ARCHIVE_CHANGED',{cause:'PURGE_SOURCE'});}
 f.release();await old;assert.equal(f.body().children.length,0);f.releaseSave();await saving;await ticks();assert.doesNotMatch(f.text(),/SYNTHETIC OLD PRIVATE MATERIAL/);assert.equal(f.policy(),true);if(boundary==='leave')assert.equal(f.nodes.get('revisit-panel').hidden,true);
});

for(const phase of ['pending','acknowledged'])test(`retired settings policy failure cannot publish after ${phase} preference intent`,async()=>{
 const f=await fixture();f.hold('PAIA_READER_POLICY');await f.owner.revisitPage.show();const status=f.nodes.get('reader-revisit-settings').children.at(-1),before=status.textContent;
 if(phase==='pending')f.holdSave();f.toggle.checked=true;const saving=f.toggle.onchange();await ticks();if(phase==='acknowledged')await saving;
 try{f.rejectHeld();await ticks();assert.equal(status.textContent,before,'retired read errors lose publication authority along with their values');}finally{f.releaseSave();await saving;}
});
test('current settings policy failure still exposes its original failure state',async()=>{
 const f=await fixture();f.hold('PAIA_READER_POLICY');await f.owner.revisitPage.show();f.rejectHeld();await ticks();assert.match(f.nodes.get('reader-revisit-settings').children.at(-1).textContent,/回顾设置暂不可读/);
});
test('captured prior preference remains the fallback after failed save and failed subsequent status read',async()=>{
 const f=await fixture();await f.owner.revisitPage.show();f.externalPolicy(true);f.event('paia:revisit-opened');await ticks();assert.equal(f.toggle.checked,true);f.failSave();f.toggle.checked=false;await f.toggle.onchange();assert.equal(f.toggle.checked,true);
 f.hold('PAIA_REVISIT_STATUS');const refresh=f.owner.revisitPage.refresh();await ticks();f.rejectHeld();await refresh;assert.equal(f.policy(),true);assert.equal(f.toggle.checked,true,'failed status must preserve the same captured prior preference restored by the failed save');
});
