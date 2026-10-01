import test from 'node:test';
import assert from 'node:assert/strict';
import {ViewSessions} from '../ui/view-session.js';
import {RouteHistory,validRoute} from '../ui/route-history.js';
import {DocumentSearchSessions} from '../ui/document-search-sessions.js';
const route=(query='SYNTHETIC private query')=>({view:'library',documentId:'conversation-1',contextInputId:'input-1',topicId:null,returnTo:'library',sourceKey:'chatgpt',projectRef:null,sort:'asc',anchor:{documentId:'conversation-1',inputId:'input-1',revision:2,offset:3,sort:'asc',expanded:['input-1']},searchQuery:query,navigator:{expanded:['group-1'],loaded:[['scope-1',80]],scrollTop:81,narrowCollapsed:false,sourceScope:'chatgpt'}});

test('view snapshots copy metadata both ways, bound LRU and reject bodies/secrets/deep payloads',()=>{
 const cache=new ViewSessions(2),original={query:'synthetic',anchor:{inputId:'input-1',offset:1}};cache.set('a',original);original.anchor.offset=2;const got=cache.get('a');got.anchor.offset=3;assert.equal(cache.get('a').anchor.offset,1);cache.set('b',{});cache.get('a');cache.set('c',{});assert.equal(cache.get('b'),undefined);assert.equal(cache.size,2);
 for(const key of ['body','text','originalText','libraryText','thoughtText','proposal','output','apiKey','note'])assert.throws(()=>cache.set('bad',{nested:{[key]:'private'}}),/Body or secret/);
 let deep={};for(let i=0;i<14;i++)deep={nested:deep};assert.throws(()=>cache.set('bad',deep),/too deep/);
 assert.throws(()=>cache.set('bad',{query:'x'.repeat(4097)}),/too large/);assert.throws(()=>cache.set('bad',new Map()),/Invalid/);assert.throws(()=>cache.set('bad',{offset:Infinity}),/Invalid/);
});

test('new route history holds references and an opaque key, never query, title, snippets or body',()=>{
 const owner=new RouteHistory(),input=route(),encoded=owner.encode(input);assert.equal(encoded.version,2);assert.match(encoded.sessionKey,/^[a-f0-9-]{36}$/);assert.equal(JSON.stringify(encoded).includes(input.searchQuery),false);assert.equal(Object.hasOwn(encoded,'searchQuery'),false);assert.equal(Object.hasOwn(encoded,'navigator'),false);assert.deepEqual(owner.decode(encoded),input);input.searchQuery='changed';assert.equal(owner.decode(encoded).searchQuery,'SYNTHETIC private query');
 const restore=new RouteHistory().decode(encoded);assert.equal(restore.documentId,'conversation-1');assert.equal(restore.searchQuery,'');assert.equal(restore.navigator.sourceScope,'chatgpt');assert.deepEqual(restore.anchor,encoded.anchor);
});

test('evicted/tampered route sessions lose view metadata without creating or granting anything',()=>{
 const owner=new RouteHistory(2),first=owner.encode(route('first'));owner.encode(route('second'));owner.encode(route('third'));assert.equal(owner.sessions.size,2);assert.equal(owner.decode(first).searchQuery,'');
 const current=owner.encode(route('current'));assert.equal(owner.decode({...current,documentId:'other'}).searchQuery,'');assert.equal(owner.decode({...current,searchQuery:'injected'}),null);assert.equal(owner.decode({...current,body:'injected'}),null);assert.equal(owner.decode({...current,anchor:{...current.anchor,body:'injected'}}),null);assert.equal(owner.decode({...current,sessionKey:'not-a-session'}),null);
});

test('query replacements share their logical entry and do not evict the root after 64 keystrokes',()=>{
 const owner=new RouteHistory(2),root=owner.encode({...route('root query'),documentId:null,contextInputId:null,anchor:null});let reader=owner.encode(route('reader query'));
 for(let i=0;i<100;i++){const next=owner.encode(route('reader query '+i),{reuseKey:reader.sessionKey});assert.equal(next.sessionKey,reader.sessionKey);reader=next;}
 assert.equal(owner.sessions.size,2);assert.equal(owner.decode(root).searchQuery,'root query');assert.equal(owner.decode(reader).searchQuery,'reader query 99');
 assert.notEqual(owner.encode({...route(),documentId:'different-owner'},{reuseKey:reader.sessionKey}).sessionKey,reader.sessionKey,'a new owner cannot share a query session');
});

test('safe old Reader history and recent-position DTOs decode, unknown body/command fields fail closed',()=>{
 const owner=new RouteHistory(),legacy=route('old safe query');legacy.anchor={...legacy.anchor,title:'SYNTHETIC title',at:'2026-01-01T00:00:00Z',position:[1,'input-1'],changed:true};assert.equal(validRoute(legacy),true);const decoded=owner.decode(legacy);assert.equal(decoded.searchQuery,'old safe query');assert.equal(Object.hasOwn(decoded.anchor,'title'),false);assert.equal(Object.hasOwn(decoded.anchor,'at'),false);
 for(const key of ['body','originalText','apiKey','consent','operationId','build'])assert.equal(owner.decode({...legacy,[key]:'blocked'}),null);
 assert.equal(owner.decode({...legacy,searchQuery:'x'.repeat(1001)}),null);assert.equal(owner.decode({...legacy,navigator:{...legacy.navigator,body:'blocked'}}),null);
});

test('only active Search retains DTOs; return restores metadata and must re-read, with bounded owners',()=>{
 const sessions=new DocumentSearchSessions(3),a=sessions.get('conversation-a');a.query='alpha';a.items=[{id:'input-a',snippet:'SYNTHETIC private snippet'}];a.generation='generation-a';a.activeInputId='input-a';a.savedAnchor={inputId:'input-a',offset:3};a.history=[null];a.cursor={after:'input-before'};
 const b=sessions.get('conversation-b');assert.deepEqual(a.items,[]);assert.equal(JSON.stringify([...sessions.metadata.entries]).includes('private snippet'),false);b.query='beta';b.items=[{id:'input-b',snippet:'SYNTHETIC other snippet'}];const again=sessions.get('conversation-a');assert.equal(again.query,'alpha');assert.deepEqual(again.items,[]);assert.equal(again.stale,true);assert.equal(again.activeInputId,'input-a');assert.deepEqual(again.savedAnchor,{inputId:'input-a',offset:3});assert.deepEqual(again.history,[null]);assert.deepEqual(again.cursor,{after:'input-before'});assert.deepEqual(b.items,[]);
 for(let i=0;i<100;i++){const page=sessions.get('conversation-'+i);page.query='query '+i;page.items=[{snippet:'synthetic '+i}];}assert.equal(sessions.size,3);assert.equal(sessions.get('conversation-a').query,'');
});

test('invalidation clears active/cached pages and generations before a stale body can be shown',()=>{
 const sessions=new DocumentSearchSessions();for(const id of ['a','b']){const page=sessions.get(id);page.query=id;page.items=[{id:'input-'+id,snippet:'deleted derivative'}];page.generation='old';page.cursor={after:'old'};page.activeInputId='input-'+id;page.loading=true;}
 sessions.invalidate();assert.deepEqual(sessions.active.items,[]);assert.equal(sessions.active.generation,null);const restored=sessions.get('a');assert.deepEqual(restored.items,[]);assert.equal(restored.generation,null);assert.equal(restored.cursor,null);assert.equal(restored.loading,false);assert.equal(restored.stale,true);assert.equal(restored.query,'a');assert.equal(restored.activeInputId,'input-a');sessions.park();assert.deepEqual(sessions.values(),[]);assert.equal(JSON.stringify([...sessions.metadata.entries]).includes('deleted derivative'),false);
});

test('over-bound Search extent loses disposable paging instead of blocking leave or retaining bodies',()=>{
 const sessions=new DocumentSearchSessions(2),page=sessions.get('long-conversation');page.query='synthetic query';page.items=[{snippet:'SYNTHETIC transient body'}];page.activeInputId='input-long';page.savedAnchor={inputId:'input-before',offset:6,expanded:['input-before']};page.history=Array.from({length:101},(_,i)=>({after:'input-'+i}));page.cursor={after:'last-page'};sessions.park();assert.deepEqual(page.items,[]);const restored=sessions.get('long-conversation');assert.equal(restored.query,'synthetic query');assert.equal(restored.activeInputId,'input-long');assert.equal(restored.savedAnchor.offset,6);assert.deepEqual(restored.items,[]);assert.deepEqual(restored.history,[]);assert.equal(restored.cursor,null);assert.equal(restored.generation,null);assert.equal(restored.stale,true);
});
