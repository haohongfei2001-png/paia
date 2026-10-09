import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {RouteHistory,validRoute,routeViews} from '../ui/route-history.js';
import {topicRootTarget,resolveTopicRootTarget} from '../core/topic-root-target.js';
const source=readFileSync(new URL('../ui/reader-navigation.js',import.meta.url),'utf8');
function fixture({saved=null,hash='#paia-thought?topic=target&section=named',available=true,accept=true,hold=false}={}){
 let release;const gate=new Promise(resolve=>release=resolve);const listeners={},events=[],reads=[],calls=[];let current={view:'library'},state=saved?{paiaReader:new RouteHistory().encode(saved)}:null;
 const history={get state(){return state;},replaceState(value){state=structuredClone(value);},pushState(value){state=structuredClone(value);}};
 const context={RouteHistory,validRoute,views:routeViews,topicRootTarget,resolveTopicRootTarget,appShellRoute:r=>structuredClone(r),crypto,structuredClone,location:{href:'chrome-extension://synthetic/ui/archive.html'+hash},history,CustomEvent:class{constructor(type,init){this.type=type;this.detail=init.detail;}},document:{addEventListener(){},querySelectorAll:()=>[],dispatchEvent:event=>events.push(event)},window:{addEventListener:(name,fn)=>listeners[name]=fn},readTopicRootSlots:()=>({snapshot:()=>({})}),request:async(type,fields)=>{reads.push({type,fields});if(type==='GET_LIBRARY_FOUNDATION_STATUS'){if(hold)await gate;return {};}assert.equal(type,'GET_LIBRARY_SECTION_PROJECTION');return {topic:{id:'target'},items:available?[{id:'named',topicId:'target'}]:[]};}};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('export function installReaderNavigation')).replace('export function','function')+'\nthis.install=installReaderNavigation;',context);
 const routes=context.install({current:()=>current,navigate:async(view,documentId,_input,options)=>{calls.push({view,documentId,options});if(!accept)return false;current={view,documentId,topicId:options.topicId};if(calls.length===1&&context.afterNavigate)return await context.afterNavigate()!==false;return true;}});
 return {routes,events,reads,calls,history,pop:()=>listeners.popstate({state}),current:()=>current,resume:release,setCurrent:value=>current=value,setURL:value=>context.location.href=value,setAfterNavigate:fn=>context.afterNavigate=fn};
}
test('native stateless fragment pop qualifies original owner, commits Topic and survives reload with exact Section',async()=>{
 const f=fixture();await f.pop();assert.equal(f.current().view,'thoughts');assert.equal(f.current().topicId,'target');assert.equal(f.history.state.paiaReader.topicId,'target');assert.equal(f.events.length,1);assert.deepEqual(f.events[0].detail,{topicId:'target',sectionId:'named'});assert.equal(f.reads.length,2);
 await f.routes.restore();assert.equal(f.current().topicId,'target');assert.equal(f.events.length,2);assert.deepEqual(f.events[1].detail,{topicId:'target',sectionId:'named'});
});
test('valid explicit history retains its own owner even when URL contains older Topic fragment',async()=>{
 for(const saved of [{view:'settings',settingsGroup:'reading'},{view:'thoughts',topicId:'other'},{view:'library',documentId:'original'}]){const f=fixture({saved});await f.pop();assert.equal(f.current().view,saved.view);assert.equal(f.current().topicId??null,saved.topicId??null);assert.equal(f.events.length,0);assert.equal(f.reads.length,0);}
});
test('missing or malformed fragment never grants a Section; refused navigation dispatches no target',async()=>{
 const missing=fixture({available:false});await missing.pop();assert.equal(missing.current().view,'thoughts');assert.equal(missing.current().topicId,null);assert.equal(missing.events.length,0);
 for(const hash of ['#paia-thought?topic=target&section=named&body=private','#other']){const f=fixture({hash});await f.pop();assert.equal(f.current().view,'library');assert.equal(f.events.length,0);assert.equal(f.reads.length,0);}
 const refused=fixture({accept:false});await refused.pop();assert.equal(refused.current().view,'library');assert.equal(refused.events.length,0);
});

test('held target qualification cannot replace newer route, history, URL or pop intent',async()=>{
 for(const changed of ['route','history','URL','pop']){const f=fixture({hold:true}),pending=f.pop();await Promise.resolve();
  if(changed==='route')f.setCurrent({view:'settings'});
  else if(changed==='history')f.history.replaceState({paiaReader:new RouteHistory().encode({view:'settings'})});
  else f.setURL('chrome-extension://synthetic/ui/archive.html');
  if(changed==='pop')await f.pop();
  const calls=f.calls.length,state=structuredClone(f.history.state);f.resume();await pending;assert.equal(f.calls.length,calls,changed);assert.deepEqual(f.history.state,state,changed);assert.equal(f.events.length,0,changed);
 }
});

test('completed older fragment navigation cannot dispatch or commit after a newer accepted same-Topic history',async()=>{
 const f=fixture();let release;const gate=new Promise(resolve=>release=resolve);
 f.setAfterNavigate(()=>gate);const old=f.pop();while(!f.calls.length)await Promise.resolve();
 f.history.replaceState({paiaReader:new RouteHistory().encode({view:'thoughts',topicId:'target'})});
 f.setURL('chrome-extension://synthetic/ui/archive.html#different-newer-anchor');
 await f.pop();const before=structuredClone(f.history.state);assert.equal(f.current().topicId,'target');assert.equal(f.events.length,0);
 release();await old;assert.equal(f.events.length,0,'old Section cannot override newer same-Topic arrival');assert.deepEqual(f.history.state,before,'old target cannot commit over newer accepted history');
});

test('post-navigation target fence preserves newer URL, history and current owner without another pop',async()=>{
 for(const changed of ['URL','history','owner']){const f=fixture();let release;const gate=new Promise(resolve=>release=resolve);f.setAfterNavigate(()=>gate);const old=f.pop();while(!f.calls.length)await Promise.resolve();
  if(changed==='URL')f.setURL('chrome-extension://synthetic/ui/archive.html#newer');
  else if(changed==='history')f.history.replaceState({paiaReader:new RouteHistory().encode({view:'settings'})});
  else f.setCurrent({view:'settings'});
  const before=structuredClone(f.history.state);release();await old;assert.equal(f.events.length,0,changed);assert.deepEqual(f.history.state,before,changed);
 }
});

test('older refused fragment completion cannot restore its checkpoint over newer valid history',async()=>{
 const f=fixture();let release;const gate=new Promise(resolve=>release=resolve);f.setAfterNavigate(async()=>{await gate;return false;});const old=f.pop();while(!f.calls.length)await Promise.resolve();
 f.history.replaceState({paiaReader:new RouteHistory().encode({view:'settings'})});await f.pop();const before=structuredClone(f.history.state);release();await old;assert.equal(f.current().view,'settings');assert.deepEqual(f.history.state,before);assert.equal(f.events.length,0);
});
