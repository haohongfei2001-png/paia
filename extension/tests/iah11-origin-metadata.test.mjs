import test from 'node:test';import assert from 'node:assert/strict';
import {validArchiveOrigin,RouteHistory,validRoute} from '../ui/route-history.js';
import {ViewSessions} from '../ui/view-session.js';
const key='11111111-1111-4111-8111-111111111111';
const snapshot=()=>({originKind:'search-results',readerDocumentId:'doc',view:'library',query:'private query',cursor:{phase:1,offset:200},pages:[null],scroll:420,searchProject:{ref:{providerKey:'chatgpt',namespace:'project',projectId:'project'},title:'Synthetic Project'},sourceScope:'chatgpt',navigator:{expanded:['group'],loaded:[],scrollTop:12,narrowCollapsed:false,sourceScope:'chatgpt'},dateStart:'2024-01-01',dateEnd:'',includeFiltered:false,focus:{kind:'input',id:'input',top:120}});
test('same-tab origin metadata is strict, bounded and copied independently',()=>{
 const value=snapshot();assert.equal(validArchiveOrigin(value),true);const store=new ViewSessions(2);store.set(key,value);value.query='B';const copy=store.get(key);copy.focus.top=0;assert.equal(store.get(key).query,'private query');assert.equal(store.get(key).focus.top,120);
 for(const bad of [{...snapshot(),body:'secret'},{...snapshot(),cursor:{body:'secret'}},{...snapshot(),focus:{kind:'input',id:'input',top:0,body:'secret'}},{...snapshot(),query:'x'.repeat(1001)},{...snapshot(),sourceScope:'invalid provider !'},{...snapshot(),pages:Array(101).fill(null)}])assert.equal(validArchiveOrigin(bad),false);
 store.set('b',{});store.set('c',{});assert.equal(store.get(key),undefined);
});
test('route history carries only opaque origin identity and preserves Settings return projection',()=>{
 const history=new RouteHistory(),route={view:'library',documentId:'doc',originKey:key,searchQuery:'reader find'};
 const encoded=history.encode(route);assert.equal(encoded.originKey,key);assert.equal(JSON.stringify(encoded).includes('reader find'),false);assert.equal(history.decode(encoded).searchQuery,'reader find');
 const cold=new RouteHistory().decode(encoded);assert.equal(cold.originKey,key);assert.equal(cold.searchQuery,'');
 const settings=history.encode({view:'settings',settingsReturn:route});assert.equal(settings.settingsReturn.originKey,key);assert.equal(history.decode(settings).settingsReturn.originKey,key);
 assert.equal(validRoute({...route,originKey:'forged'}),false);assert.equal(history.decode({...encoded,originKey:'forged'}),null);
});
