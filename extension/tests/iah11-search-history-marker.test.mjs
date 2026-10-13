import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {RouteHistory,validRoute,routeViews} from '../ui/route-history.js';
const source=readFileSync(new URL('../ui/reader-navigation.js',import.meta.url),'utf8');
function fixture(){
 const listeners={},entries=[null];let at=0,current={view:'library',documentId:null,searchQuery:''};
 const history={get state(){return entries[at];},replaceState(s){entries[at]=structuredClone(s);},pushState(s){entries.splice(++at);entries[at]=structuredClone(s);},async back(){if(at)await listeners.popstate({state:entries[--at]});},async forward(){if(at+1<entries.length)await listeners.popstate({state:entries[++at]});}};
 const context={RouteHistory,validRoute,views:routeViews,appShellRoute:r=>structuredClone(r),presentAppShell(){},crypto,structuredClone,location:{href:'chrome-extension://synthetic/ui/archive.html'},history,document:{addEventListener(){},querySelectorAll:()=>[]},window:{addEventListener:(name,fn)=>listeners[name]=fn},readTopicRootSlots:()=>({snapshot:()=>({})})};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('export function installReaderNavigation')).replace('export function','function')+'\nthis.install=installReaderNavigation;',context);
 const routes=context.install({current:()=>current,navigate:async(view,documentId,_input,options)=>{current={view,documentId,searchQuery:options.searchQuery};}});routes.commit({replace:true});
 return {history,routes,set:r=>{current=r;},current:()=>current};
}
test('same-entry origin checkpoint preserves true Search marker, Reader push does not inherit it, Back/Forward retain owners',async()=>{
 const f=fixture();f.history.pushState({...f.history.state,paiaSearch:true});f.set({view:'library',documentId:null,originKey:'11111111-1111-4111-8111-111111111111'});f.routes.commit({replace:true});assert.equal(f.history.state.paiaSearch,true);
 f.set({view:'library',documentId:'synthetic-reader'});f.routes.commit();assert.equal(f.history.state.paiaSearch,undefined);
 await f.history.back();assert.equal(f.history.state.paiaSearch,true);assert.equal(f.current().documentId,null);
 await f.history.forward();assert.equal(f.history.state.paiaSearch,undefined);assert.equal(f.current().documentId,'synthetic-reader');
});
for(const marker of [undefined,false,'true',{}])test('absent or malformed Search marker is never manufactured: '+JSON.stringify(marker),()=>{
 const f=fixture();f.history.replaceState({...f.history.state,paiaSearch:marker});f.set({view:'library',documentId:null,searchQuery:'changed'});f.routes.commit({replace:true});assert.equal(f.history.state.paiaSearch,undefined);
});
test('replacement into a different route owner drops Search marker',()=>{for(const next of [{view:'thoughts',topicId:'synthetic-topic'},{view:'library',documentId:'synthetic-reader'},{view:'settings'}]){const f=fixture();f.history.replaceState({...f.history.state,paiaSearch:true});f.set(next);f.routes.commit({replace:true});assert.equal(f.history.state.paiaSearch,undefined);}});
test('true Search marker without a valid prior route is not inherited',()=>{const f=fixture();f.history.replaceState({paiaSearch:true,paiaReader:{view:'library',unexpected:true}});f.set({view:'library',documentId:null,searchQuery:'changed'});f.routes.commit({replace:true});assert.equal(f.history.state.paiaSearch,undefined);});
test('Source, Project and Context identity replacements do not inherit Search owner',()=>{
 for(const [before,after]of [
  [{view:'library',sourceKey:'chatgpt'},{view:'library',sourceKey:'claude'}],
  [{view:'library',projectRef:{providerKey:'chatgpt',namespace:'synthetic',projectId:'a'}},{view:'library',projectRef:{providerKey:'chatgpt',namespace:'synthetic',projectId:'b'}}],
  [{view:'memory',contextCard:'info'},{view:'memory',contextCard:'rules'}],
  [{view:'library',documentId:'doc',contextInputId:'a'},{view:'library',documentId:'doc',contextInputId:'b'}]
 ]){const f=fixture();f.set(before);f.routes.commit();f.history.replaceState({...f.history.state,paiaSearch:true});f.set(after);f.routes.commit({replace:true});assert.equal(f.history.state.paiaSearch,undefined);}
});

// Exercise the actual Settings composition callback against the real history owner.
test('Settings focus checkpoint before navigation completion cannot replace the departure entry',async()=>{
 const f=fixture(),shellSource=readFileSync(new URL('../ui/app-shell.js',import.meta.url),'utf8');
 const callback=shellSource.match(/routeChanged:(options=>[^,]+),back:/)?.[1];assert.ok(callback,'actual Settings route callback is present');
 const changed=vm.runInNewContext('(function(){return '+callback+';}).call(shell)',{shell:{routes:f.routes}});
 f.set({view:'settings'});changed({replace:true});f.routes.commit();
 assert.equal(f.history.state.paiaReader.view,'settings');
 changed({replace:true});
 await f.history.back();assert.equal(f.current().view,'library','focus/scroll during arrival preserves the real departure route');
 await f.history.forward();assert.equal(f.current().view,'settings','the final navigation still pushes exactly one Settings entry');
});

test('automatic initial Source metadata keeps the same root Search entry only with explicit initialization ownership',()=>{
 const f=fixture();f.history.replaceState({...f.history.state,paiaSearch:true});f.set({view:'library',documentId:null,sourceKey:'chatgpt'});f.routes.commit({replace:true,sourceInitialization:true});assert.equal(f.history.state.paiaSearch,true);
});
for(const [name,before,after,options]of [
 ['ordinary source selection',{view:'library'},{view:'library',sourceKey:'chatgpt'},{replace:true}],
 ['different source',{view:'library',sourceKey:'chatgpt'},{view:'library',sourceKey:'claude'},{replace:true,sourceInitialization:true}],
 ['Reader arrival',{view:'library'},{view:'library',documentId:'reader',sourceKey:'chatgpt'},{replace:true,sourceInitialization:true}],
 ['different project',{view:'library'},{view:'library',sourceKey:'chatgpt',projectRef:{providerKey:'chatgpt',namespace:'synthetic',projectId:'p'}},{replace:true,sourceInitialization:true}],
 ['new entry',{view:'library'},{view:'library',sourceKey:'chatgpt'},{sourceInitialization:true}]
])test('initial Source exception cannot retain Search across '+name,()=>{const f=fixture();f.set(before);f.routes.commit({replace:true});f.history.replaceState({...f.history.state,paiaSearch:true});f.set(after);f.routes.commit(options);assert.equal(f.history.state.paiaSearch,undefined);});
