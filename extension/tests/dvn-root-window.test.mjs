import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {wireSearchKeyboard} from '../ui/search-experience.js';
import {ContinuousRootReader} from '../ui/continuous-root-reader.js';
import {FilterRunner} from '../core/filter-runner.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {setup} from './harness/thought-m1.mjs';
import {TopicController} from '../ui/topic-workspace.js';
const op=()=>crypto.randomUUID();
const bodies=reader=>[...reader.bodies.values()];
test('D7 empty root hides only a confirmed terminal notice and reveals every live recovery state',()=>{
 const previous=globalThis.document,nodes=new Map(['thought-continuous-sentinel','thought-continuous-status','thought-continuous-retry'].map(id=>[id,{dataset:{},hidden:false,textContent:''}]));
 globalThis.document={documentElement:{lang:'zh-CN'},getElementById:id=>nodes.get(id)};
 const owner=Object.assign(Object.create(TopicController.prototype),{thoughtRootVisible:()=>false}),complete={items:[],terminal:true,complete:true,coverage:{complete:true},loading:false,error:null,stale:false,protectionBlocked:false,pageMeta:{indexing:false}};
 const sentinel=nodes.get('thought-continuous-sentinel'),retry=nodes.get('thought-continuous-retry'),status=nodes.get('thought-continuous-status');
 try{
  owner.updateHomeContinuous(complete);assert.equal(sentinel.hidden,true);assert.equal(retry.hidden,true);assert.equal(sentinel.dataset.terminal,'true');
  for(const state of [
   {...complete,items:[{key:'existing-ref'}]},
   {...complete,loading:true},
   {...complete,error:Error('SYNTHETIC_FIRST_LOAD')},
   {...complete,items:[{key:'unhydrated-ref'}],error:Error('SYNTHETIC_HYDRATION')},
   {...complete,terminal:false,complete:false},
   {...complete,complete:false},
   {...complete,coverage:{complete:false}},
   {...complete,pageMeta:{indexing:true}},
   {...complete,stale:true},
   {...complete,protectionBlocked:true}
  ]){
   owner.updateHomeContinuous(state);assert.equal(sentinel.hidden,false,JSON.stringify(state));assert.equal(retry.hidden,!state.error);assert.ok(status.textContent);
   owner.updateHomeContinuous(complete);assert.equal(sentinel.hidden,true,'subsequent complete empty read can clear old feedback');
  }
  owner.updateHomeContinuous({...complete,items:[{key:'next-ref'}]});assert.equal(sentinel.hidden,false);assert.equal(status.textContent,'已到列表末尾');
 }finally{clearTimeout(owner.continuousTimer);globalThis.document=previous;}
});
function fixture(count=300){
 const rows=Array.from({length:count},(_,i)=>({id:'topic-'+i,name:'SYNTHETIC_TITLE_'+i,revision:1,rootCue:{text:'SYNTHETIC_CUE_'+i},readRef:{kind:'topic',id:'topic-'+i,revision:1}}));
 const reads=[];let authority='A';
 const load=async({cursor,authority:expected})=>{reads.push(cursor);if(expected&&expected!==authority)return {cursorInvalid:true,items:[]};const start=cursor||0,end=Math.min(start+40,count);return {items:rows.slice(start,end),nextCursor:end<count?end:null,authority,complete:end===count,coverage:{complete:true},recent:[{summary:'MUST_NOT_RETAIN'}]};};
 const reader=new ContinuousRootReader({scope:'root',load});return {reader,rows,reads,load,setAuthority:value=>authority=value};
}
test('D2 root window reaches every300 ref and keeps120 bodies with body-free snapshots and exact backward replay',async()=>{
 const f=fixture(),r=f.reader;await r.loadUntil({minItems:300});assert.equal(r.items.length,300);assert.equal(r.terminal,true);assert.equal(r.bodies.size,120);assert.equal(r.windowStart,180);
 const snapshot=r.snapshot(),encoded=JSON.stringify(snapshot);assert.doesNotMatch(encoded,/SYNTHETIC_CUE|SYNTHETIC_TITLE|MUST_NOT_RETAIN/);assert.equal(snapshot.items.length,300);assert.equal(snapshot.requests.length,8);
 const restored=new ContinuousRootReader({scope:'root',load:f.load});restored.restore(snapshot);assert.equal(restored.bodies.size,0);assert.equal(await restored.hydrateWindow(),true);assert.equal(restored.bodies.size,120);assert.equal(restored.terminal,true);
 restored.around('item:topic-0');assert.equal(await restored.hydrateWindow(),true);assert.equal(bodies(restored)[0].rootCue.text,'SYNTHETIC_CUE_0');assert.equal(restored.bodies.size,120);assert.ok(f.reads.filter(x=>x===null).length>=2);
 assert.deepEqual(restored.items.map(x=>x.ref.id),f.rows.map(x=>x.id));
});
test('D2 focused root row is pinned outside120, but invalidation outranks every retained body',async()=>{
 const f=fixture(),r=f.reader;r.pins=()=>new Set(['item:topic-0']);await r.loadUntil({minItems:300});assert.equal(r.bodies.size,121);assert.equal(r.layout().filter(x=>x.kind==='item').length,121);assert.equal(r.bodies.get('item:topic-0').rootCue.text,'SYNTHETIC_CUE_0');r.invalidate();assert.equal(r.bodies.size,0);assert.equal(await r.hydrateWindow(),false);
 const blocked=fixture().reader;blocked.pins=()=>new Set(Array.from({length:33},(_,i)=>'item:topic-'+i));await blocked.loadNext();assert.equal(blocked.protectionBlocked,true);assert.equal(blocked.items.length,0);
});
test('D2 exact root replay rejects changed authority and changed refs without returning wrong offset bodies',async()=>{
 for(const cause of ['authority','ref']){const f=fixture(),r=f.reader;await r.loadUntil({minItems:300});r.around('item:topic-0');if(cause==='authority')f.setAuthority('B');else f.rows[0]={...f.rows[0],readRef:{kind:'topic',id:'different',revision:2}};assert.equal(await r.hydrateWindow(),false);assert.equal(r.stale,true);assert.equal(r.bodies.size,0);}
});
test('D2 root failed replay preserves extent, explicit retry works at terminal frontier and never consumes refs',async()=>{
 const f=fixture(),r=f.reader;await r.loadUntil({minItems:300});r.around('item:topic-0');const prior=r.items.map(x=>x.ref.id);let calls=0;r.load=async()=>{calls++;throw Error('SYNTHETIC_OFFLINE');};assert.equal(await r.hydrateWindow(),false);assert.equal(calls,1);assert.equal(r.bodies.size,0,'non-retained cache is released before replay; prior DOM is the UI fallback');assert.deepEqual(r.items.map(x=>x.ref.id),prior);assert.equal(r.terminal,true);r.load=f.load;assert.equal(await r.hydrateWindow(),true);assert.equal(r.bodies.size,120);assert.equal(r.bodies.get('item:topic-0').rootCue.text,'SYNTHETIC_CUE_0');
});
test('D2 root delayed hydration respects latest window and scope intent',async()=>{
 const f=fixture(),r=f.reader;await r.loadUntil({minItems:300});r.around('item:topic-0');let finish;r.load=()=>new Promise(resolve=>finish=resolve);const pending=r.hydrateWindow();r.around('item:topic-200');finish(await f.load({cursor:null,authority:'A'}));assert.equal(await pending,false);assert.equal(r.bodies.has('item:topic-0'),false);
 let finishNew;r.load=()=>new Promise(resolve=>finishNew=resolve);r.around('item:topic-0');const old=r.hydrateWindow();r.reset({scope:'source:claude',query:'different'});finishNew(await f.load({cursor:null,authority:'A'}));assert.equal(await old,false);assert.equal(r.bodies.size,0);assert.equal(r.items.length,0);
});
test('D2 actual compact root exposes only bounded cue and scalars, recent metadata contains no Topic body',async()=>{
 const {s}=await setup(OrganizerStore),topic=await s.createTopic({name:'Synthetic compact root',operationId:op()});
 await s.editTopic({id:topic.id,expectedRevision:(await s.topic(topic.id)).revision,changes:{summary:'SYNTHETIC_HUMAN_CUE '+('长'.repeat(3000))},operationId:op()});await s.recordTopicRead(topic.id);
 const page=await s.libraryIndexPage({mode:'stable'}),row=page.items[0];assert.equal(row.name,'Synthetic compact root');assert.ok(row.rootCue.text.startsWith('SYNTHETIC_HUMAN_CUE'));assert.ok(row.rootCue.text.length<=140);assert.equal(row.rootCue.truncated,true);
 for(const forbidden of ['summary','protections','authorship','countCache','sourceRecordIds','readingActivity','presentation'])assert.equal(Object.hasOwn(row,forbidden),false,forbidden);
 assert.equal(page.recent[0].id,topic.id);assert.deepEqual(Object.keys(page.recent[0]).sort(),['id','readAt']);assert.doesNotMatch(JSON.stringify(row.readRef),/SYNTHETIC/);
 const same=await s.libraryIndexPage({mode:'stable',authority:page.authority});assert.equal(same.authority,page.authority);
 await s.editTopic({id:topic.id,expectedRevision:(await s.topic(topic.id)).revision,changes:{summary:'NEW_AUTHORITY'},operationId:op()});const stale=await s.libraryIndexPage({mode:'stable',authority:page.authority});assert.equal(stale.cursorInvalid,true);assert.equal(stale.items.length,0);assert.doesNotMatch(JSON.stringify(stale),/SYNTHETIC_HUMAN_CUE|NEW_AUTHORITY/);
});
test('D2 actual final root authority fence rejects a mutation admitted between candidate read and cue publication',async()=>{
 const {s}=await setup(OrganizerStore),topic=await s.createTopic({name:'OLD_ROOT_CANARY',operationId:op()});
 const count=s.topicCount.bind(s);let changed=false;s.topicCount=async(...args)=>{const value=await count(...args);if(!changed){changed=true;await s.editTopic({id:topic.id,expectedRevision:(await s.topic(topic.id)).revision,changes:{name:'NEW_ROOT_CANARY'},operationId:op()});}return value;};
 const page=await s.libraryIndexPage({mode:'stable'});assert.equal(page.cursorInvalid,true);assert.equal(page.items.length,0);assert.doesNotMatch(JSON.stringify(page),/ROOT_CANARY/);
});
test('D2 Topic controller owns exactly one active coordination path and responsive CSS cannot grant edit authority',()=>{
 const owner=readFileSync(new URL('../ui/topic-workspace.js',import.meta.url),'utf8'),compat=readFileSync(new URL('../ui/thoughts.js',import.meta.url),'utf8'),css=readFileSync(new URL('../ui/thought-reader.css',import.meta.url),'utf8');
 assert.doesNotMatch(owner,/extends Base|super\.|updateMobileEditing|mobileMedia|thought-mobile|renderExpressionDocument/);assert.match(compat,/export \{TopicController as ThoughtWorkspace\}/);assert.equal(typeof TopicController.prototype.readRefresh,'function');assert.equal(typeof TopicController.prototype.renderDocument,'function');assert.doesNotMatch(css,/799px|899px|720px|thought-mobile/);
 assert.equal((owner.match(/\$\('topic-search'\)\.addEventListener\('input'/g)||[]).length,1);assert.equal((owner.match(/\$\('thought-search'\)\.addEventListener\('input'/g)||[]).length,1);
});

import {completeFixture,rows} from './harness/original-complete.mjs';
import {AI_FIELDS,AI_SCHEMA_VERSION} from '../core/organizer/ai-contract.js';
test('D2 saved-AI root response refuses a filter policy change after the actual eligible result read',async()=>{
 const f=await completeFixture({texts:['继续']}),{s}=f;await s.evaluateFilters();await s.setFilterMode('off');await f.runner.wake();const topic=(await rows(s,'topics'))[0],entry=(await rows(s,'thoughts'))[0];
 await s.foundationWrite(t=>t.put('meta',{id:'aiPresentation:'+topic.id,topicId:topic.id,schemaVersion:AI_SCHEMA_VERSION,revision:1,evidenceEntryIds:[entry.id],protections:{},...Object.fromEntries(AI_FIELDS.map(k=>[k,['blockSummary','currentView'].includes(k)?'':[]])),currentView:'SYNTHETIC_FILTER_NEEDLE'}));
 const options={mode:'stable',query:'SYNTHETIC_FILTER_NEEDLE',cursor:{mode:'compact_root_search',query:'synthetic_filter_needle',phase:'ai',key:null}},before=await s.libraryIndexPage(options),original=s.searchSavedAI.bind(s);let switched=false;
 s.searchSavedAI=async o=>{const page=await original(o);if(!switched){switched=true;await s.setFilterMode('light');}return page;};
 const response=await s.libraryIndexPage({...options,authority:before.authority});s.searchSavedAI=original;const fresh=await s.libraryIndexPage(options);assert.equal(before.items.length,1);assert.equal(response.cursorInvalid,true);assert.equal(response.items.length,0);assert.equal(fresh.items.length,0);assert.notEqual(before.authority,fresh.authority);
 const input=(await rows(s,'blocks'))[0].value;await s.keepInput(input.id);const kept=await s.libraryIndexPage(options);assert.equal(kept.items.length,1);assert.notEqual(kept.authority,fresh.authority,'explicit keep advances the existing portable-data authority');
 await s.foundationWrite(async t=>{const row=await t.get('meta','aiPresentation:'+topic.id);row.topicId='different-topic';await t.put('meta',row);});assert.equal((await s.libraryIndexPage(options)).items.length,0,'a mismatched saved presentation is never promoted by search');
});
test('D2 incomplete search cursor cannot become complete after newly indexed rows appear behind it',async()=>{
 const {s}=await completeFixture({texts:[]}),topic=await s.createTopic({name:'SYNTHETIC search progress',operationId:op()}),ids=[];
 for(let i=0;i<2;i++)ids.push((await s.continueThinking({operationId:op(),topicId:topic.id,body:'SYNTHETIC ordinary body'})).id);ids.sort();
 const edit=async(id,body)=>{const e=await s.entry(id);await s.editLibraryFields({id,expectedRevision:e.revision,expectedFieldRevisions:e.fieldRevisions,changes:{body},operationId:op()});};
 await edit(ids[1],'SYNTHETIC_NEEDLE later indexed');await s.drainLibraryMaintenance();await edit(ids[0],'SYNTHETIC_NEEDLE newly eligible earlier');
 const options={mode:'stable',query:'SYNTHETIC_NEEDLE',limit:1},first=await s.libraryIndexPage(options);assert.equal(first.indexing,true);assert.deepEqual(first.items.filter(x=>x.kind==='entry').map(x=>x.entryId),[ids[1]]);
 await s.drainLibraryMaintenance();const next=await s.libraryIndexPage({...options,cursor:first.nextCursor,authority:first.authority});assert.equal(next.cursorInvalid,true);assert.equal(next.complete,false);assert.equal(next.items.length,0);
 const fresh=[];let cursor=null;for(let i=0;i<10;i++){const page=await s.libraryIndexPage({...options,cursor});fresh.push(...page.items.filter(x=>x.kind==='entry').map(x=>x.entryId));cursor=page.nextCursor;if(!cursor){assert.equal(page.complete,true);break;}}
 assert.deepEqual(fresh.sort(),ids);
});

test('D2 cold300 root remains traversable while each newly visited count cache warms',async()=>{
 const {s}=await setup(OrganizerStore),ids=[];for(let i=0;i<300;i++)ids.push((await s.createTopic({name:'SYNTHETIC_COLD_'+i,operationId:op()})).id);await s.drainLibraryMaintenance();
 const r=new ContinuousRootReader({scope:'root',load:async({cursor,authority})=>{const page=await s.libraryIndexPage({mode:'stable',cursor,authority,limit:40});await s.drainLibraryMaintenance();return page;}});
 await r.loadUntil({minItems:300});assert.equal(r.stale,false);assert.equal(r.terminal,true);assert.equal(r.items.length,300);assert.equal(r.bodies.size,120);assert.deepEqual(r.items.map(x=>x.ref.id).sort(),ids.sort());
 const first=r.items[0].ref.id;await s.recordTopicRead(first);r.around(r.items[0].key);assert.equal(await r.hydrateWindow(),true,'ordinary reading activity does not invalidate deep root replay');const topic=await s.repository.transaction(false,t=>t.get('topics',first)),generation=await s.repository.transaction(false,t=>t.get('meta','backup-data-generation'));
 await assert.rejects(s.repository.transaction(true,t=>t.putDerivedTopicRead({...topic,name:'SYNTHETIC_FORBIDDEN_REWRITE'})),error=>error.code==='STORAGE_FAILED');
 await assert.rejects(s.repository.transaction(true,t=>t.putDerivedTopicCount({...topic,name:'SYNTHETIC_FORBIDDEN_REWRITE'})),error=>error.code==='STORAGE_FAILED');assert.notEqual((await s.topic(first)).name,'SYNTHETIC_FORBIDDEN_REWRITE');assert.deepEqual(await s.repository.transaction(false,t=>t.get('meta','backup-data-generation')),generation);
});

test('D2 root emitted continuation independently binds authority for ordinary cursor-only callers',async()=>{
 const {s}=await setup(OrganizerStore);for(let i=0;i<3;i++)await s.createTopic({name:'SYNTHETIC_CURSOR_'+i,operationId:op()});const first=await s.libraryIndexPage({mode:'stable',limit:1});assert.equal(first.nextCursor.authority,first.authority);const topic=first.items[0];await s.editTopic({id:topic.id,expectedRevision:topic.revision,changes:{name:'SYNTHETIC_CHANGED'},operationId:op()});const page=await s.libraryIndexPage({mode:'stable',cursor:first.nextCursor,limit:1});assert.equal(page.cursorInvalid,true);assert.equal(page.items.length,0);
});
test('D2 rapid root query clear restores the deep snapshot before any search debounce has run',async()=>{
 const f=fixture(),r=f.reader;await r.loadUntil({minItems:300});let query='needle';const input={get value(){return query;}},priorDocument=globalThis.document,priorScrollY=globalThis.scrollY;globalThis.scrollY=12000;
 const w=Object.assign(Object.create(TopicController.prototype),{homeCollection:r,homePage:{items:[{rootCue:{text:'SYNTHETIC_OLD_PAGE'}}]},rootProviderKey:null,serial:0,captureHomeAnchor:()=>({key:'item:topic-240',top:120}),createHomeCollection:()=>new ContinuousRootReader({scope:'root',load:f.load}),refresh:async()=>{}});globalThis.document={getElementById:id=>{assert.equal(id,'thought-search');return input;}};
 try{w.searchRoot();assert.equal(w.homeCollection,null);assert.equal(w.homePage,null);assert.equal(w.rootPreSearch.snapshot.items.length,300);query='';w.searchRoot();assert.equal(w.homeCollection.items.length,300);assert.equal(w.homeDesiredCount,300);assert.equal(w.rootInvalidationAnchor.key,'item:topic-240');assert.equal(w.homeCollection.bodies.size,0);assert.equal(w.preserveHomeRefresh,true);assert.equal(w.rootPreSearch,null);}finally{clearTimeout(w.searchTimer);globalThis.document=priorDocument;globalThis.scrollY=priorScrollY;}
});

test('D2 stale root replacement cannot publish or clear the anchor of a newer route intent',async()=>{
 let finish,painted=0;const priorDocument=globalThis.document,nodes=new Map(),old={state:()=>({items:[{}],stale:true})},replacement={loadUntil:()=>new Promise(resolve=>finish=resolve)};
 globalThis.document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,{value:id==='thought-search'?'old':'',hidden:false});return nodes.get(id);}};
 const w=Object.assign(Object.create(TopicController.prototype),{id:null,serial:0,rootCueEpoch:0,homeCollection:old,rootProviderKey:null,ensureContinuousRoot(){},updateRootSourceOptions(){},homeCollectionScope:()=> 'root',clearHomeRows(){},createHomeCollection:()=>replacement,renderHomeReader(){painted++;return true;}});old.scope='root';old.query='old';
 try{const pending=w.readContentRefresh();assert.equal(w.homeCollection,replacement);w.serial++;w.homeCollection={scope:'new'};w.rootInvalidationAnchor={key:'new-anchor'};finish({items:[],complete:true});assert.equal(await pending,false);assert.equal(painted,0);assert.deepEqual(w.rootInvalidationAnchor,{key:'new-anchor'});}finally{globalThis.document=priorDocument;}
});

test('D2 live Topic constructor initializes view sessions once without executing a maintenance callback',async()=>{
 class Node{constructor(tag='div'){this.tagName=tag;this.children=[];this.dataset={};this.listeners=new Map();this.attributes=new Map();this.classList={add(){},toggle(){}};this.style={};this.textContent='';}append(...nodes){this.children.push(...nodes);for(const n of nodes)n.parentElement=this;}addEventListener(name,fn){this.listeners.set(name,[...(this.listeners.get(name)||[]),fn]);}setAttribute(name,value){this.attributes.set(name,String(value));}getAttribute(name){return this.attributes.get(name)??null;}removeAttribute(name){this.attributes.delete(name);}after(){}before(){}closest(){return null;}querySelectorAll(selector){return selector==='button'?this.children.flatMap(n=>[...(n.tagName==='button'?[n]:[]),...n.querySelectorAll(selector)]):[];}querySelector(selector){if(selector==='button')return this.querySelectorAll(selector)[0];return new Node();}get lastElementChild(){return this.children.at(-1);}replaceChildren(...nodes){this.children=[];this.append(...nodes);}}
 const globals=['document','window','chrome','MutationObserver','scrollY'],previous=new Map(globals.map(k=>[k,globalThis[k]])),nodes=new Map(),events=[];
 const get=id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);};
 globalThis.document={getElementById:get,createElement:tag=>new Node(tag),createElementNS:(namespace,tag)=>Object.assign(new Node(tag),{namespaceURI:namespace}),createTextNode:text=>Object.assign(new Node('#text'),{textContent:text}),querySelectorAll:()=>[],documentElement:{lang:'zh-CN'},addEventListener:(type,fn)=>events.push([type,fn])};globalThis.window={addEventListener(){}};globalThis.MutationObserver=class{observe(){}};globalThis.scrollY=0;globalThis.chrome={runtime:{sendMessage:async()=>({ok:true,data:{layout:'list'}})}};
 try{const controller=new TopicController({onStatus(){},onOpen(){}});await Promise.resolve();assert.equal(controller.originalMode,'content');assert.ok(controller.aiViewSession);assert.equal(controller.aiCandidateChoices,undefined,'retired approval state is not constructed');assert.ok(controller.timelinePositions);assert.ok(controller.contentPositions);assert.equal(get('library-rebuild-search').listeners.get('click').length,1);assert.equal(get('thought-search').listeners.get('input').length,1);assert.equal(get('topic-search').listeners.get('input').length,1);assert.equal(get('ai-presentation-toggle').listeners.get('change').length,1);}finally{for(const [key,value]of previous)if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
});
test('D2 held large-body read cannot enter a new editor or an old expression generation',async()=>{
 const previous=globalThis.chrome;
 try{
  for(const mode of ['route','revision','generation','current']){
   let finish,added=0,painted=0,refreshed=0,rendered;const node={isConnected:true,replaceWith(){painted++;}},owner={entry:{addRows(){added++;}}},descriptor={entry:{id:'entry',revision:7,expressionTime:{basis:'source',year:2021,at:'2021-01-01T00:00:00Z'},timeBasis:'source'}};
   const reader={sort:'asc',query:'',coverage:{activeGeneration:'G'},items:[descriptor],index:new Map([['entry',0]]),bodyRevision:0,trimBodies(){},load:async options=>{assert.equal(options.expectedReadGeneration,'G');return mode==='generation'?{cursorInvalid:true,items:[]}:{items:[descriptor]};}};
   const w=Object.assign(Object.create(TopicController.prototype),{id:'topic',view:'original',serial:1,editor:owner,topicReader:reader,onStatus(){},refresh(){refreshed++;},entryNode(item){rendered=item;return {};}});globalThis.chrome={runtime:{sendMessage:()=>new Promise(resolve=>finish=resolve)}};
   const pending=w.loadLargeEntry(descriptor,node);if(mode==='route')w.editor={entry:{addRows(){throw Error('wrong owner');}}};finish({ok:true,data:{id:'entry',revision:mode==='revision'?8:7,body:'SYNTHETIC_LARGE_BODY'}});await pending;
   assert.equal(added,mode==='current'?1:0,mode);assert.equal(painted,mode==='current'?1:0,mode);assert.equal(refreshed,['revision','generation'].includes(mode)?1:0,mode);if(mode==='current'){assert.equal(rendered.entry.body,'SYNTHETIC_LARGE_BODY');assert.deepEqual(rendered.entry.expressionTime,descriptor.entry.expressionTime);assert.equal(reader.items[0].entry.body,'SYNTHETIC_LARGE_BODY');assert.equal(reader.items[0].entry.large,undefined);assert.equal(reader.bodyRevision,1);}
  }
 }finally{globalThis.chrome=previous;}
});

test('D2 cache plus staged replay stays within120 and a held second page releases all old-scope bodies on reset',async()=>{
 const f=fixture(),r=f.reader;await r.loadUntil({minItems:300});r.around('item:topic-0');let reads=0,finish,staged;const reached=new Promise(resolve=>staged=resolve);
 r.load=async options=>{reads++;if(reads===2){staged();return new Promise(resolve=>finish=resolve);}return f.load(options);};
 const pending=r.hydrateWindow();await reached;const buffer=r.hydration.pending;assert.equal(r.bodies.size,0);assert.equal(buffer.size,40);assert.ok(r.bodies.size+buffer.size<=120);r.reset({scope:'new-query',query:'different'});assert.equal(buffer.size,0);assert.equal(r.hydration,null);assert.equal(r.bodies.size,0);finish(await f.load({cursor:40,authority:'A'}));assert.equal(await pending,false);assert.equal(r.bodies.size,0);assert.equal(r.items.length,0);
 const same=fixture().reader;await same.loadUntil({minItems:300});same.shiftWindow('previous');let peak=0;const load=same.load;same.load=async options=>{peak=Math.max(peak,same.bodies.size+(same.hydration?.pending.size||0));return load(options);};assert.equal(await same.hydrateWindow(),true);assert.ok(peak<=120);assert.equal(same.bodies.size,120);
});

test('D2 frontier advance cancels a held backward staging buffer before hydrating the newer window',async()=>{
 const f=fixture(400),r=f.reader;await r.loadUntil({minItems:320});r.around('item:topic-0');let calls=0,finish,reached;const second=new Promise(resolve=>reached=resolve);
 r.load=async options=>{if(++calls===2){reached();return new Promise(resolve=>finish=resolve);}return f.load(options);};const old=r.hydrateWindow();await second;const buffer=r.hydration.pending;assert.equal(buffer.size,40);
 await r.loadNext();assert.equal(buffer.size,0,'frontier admission releases the superseded partial replay');assert.equal(r.windowStart,240);assert.equal(await r.hydrateWindow(),true);assert.equal(r.bodies.size,120);assert.equal(buffer.size,0);assert.ok(r.bodies.size+buffer.size<=120);finish(await f.load({cursor:40,authority:'A'}));assert.equal(await old,false);assert.equal(r.bodies.size,120);assert.equal(r.bodies.has('item:topic-0'),false);
});

test('D2 only the current root anchor restoration may release its programmatic-scroll gate',()=>{
 const previous={document:globalThis.document,requestAnimationFrame:globalThis.requestAnimationFrame,scrollBy:globalThis.scrollBy},frames=[],node={dataset:{rootKey:'one'},getBoundingClientRect:()=>({top:200})};globalThis.document={getElementById:()=>({querySelectorAll:()=>[node]})};globalThis.requestAnimationFrame=fn=>frames.push(fn);globalThis.scrollBy=()=>{};
 const w=Object.assign(Object.create(TopicController.prototype),{homeCollection:{},serial:1});
 try{w.restoreHomeAnchor({key:'one',top:140});frames.shift()();const staleCleanup=frames.shift();w.restoreHomeAnchor({key:'one',top:150});staleCleanup();assert.equal(w.homeRestoring,true);const staleOuter=frames.shift();w.serial++;w.restoreHomeAnchor({key:'one',top:160});staleOuter();assert.equal(w.homeRestoring,true);frames.shift()();assert.equal(w.homeRestoring,true);frames.shift()();assert.equal(w.homeRestoring,false);}finally{Object.assign(globalThis,previous);}
});

test('D2 explicit root reveal survives a focus-triggered replay already pending or failed',async()=>{
 for(const failed of [false,true]){const r={windowStart:40,windowSize:120,windowRevision:2,items:Array.from({length:200},(_,i)=>({key:'key'+i})),error:failed?Error('STORAGE_FAILED'):null},w=Object.assign(Object.create(TopicController.prototype),{homeCollection:r,homeWindowShifting:!failed,homeWindowShift:failed?null:{collection:r},thoughtRootVisible:()=>true});await w.shiftHomeWindow('previous',{reveal:true});assert.deepEqual(w.homeHydrationAnchor,{key:'key40',top:140,focus:true});assert.equal(w.homeWindowReveal.collection,r);assert.equal(w.homeWindowReveal.revision,2);}
});

test('D2 a root replay owns its window until hydration completes even when Retry scrolls the sentinel into view',async()=>{
 const reader={loading:false,hydration:{},shiftWindow(){throw Error('must not supersede retry');},loadNext(){throw Error('must not supersede retry');}},w=Object.assign(Object.create(TopicController.prototype),{homeCollection:reader,thoughtRootVisible:()=>true});await w.shiftHomeWindow('next');await w.loadHomeNext({explicit:false});assert.equal(w.homeCollection,reader);
});
test('D2 focusing the root search above a deep window retains its last body-free reading anchor',async()=>{
 const f=fixture(),r=f.reader;await r.loadUntil({minItems:300});const previous={document:globalThis.document,scrollY:globalThis.scrollY},input={value:'needle'},anchor={key:r.items[240].key,top:130},w=Object.assign(Object.create(TopicController.prototype),{homeCollection:r,rootProviderKey:null,serial:1,captureHomeAnchor:()=>null,refresh:async()=>{}});globalThis.document={getElementById:()=>input};globalThis.scrollY=0;
 try{w.rememberHomeAnchor(anchor);w.searchRoot();assert.deepEqual(w.rootPreSearch.anchor,{...anchor,id:null});assert.equal(w.rootPreSearch.snapshot.items.length,300);assert.doesNotMatch(JSON.stringify(w.homeReadingPosition),/SYNTHETIC/);}finally{clearTimeout(w.searchTimer);Object.assign(globalThis,previous);}
});

test('D2 a held old-scope window shift neither blocks nor unlocks a newer reader shift',async()=>{
 const priorY=globalThis.scrollY;globalThis.scrollY=100;const old={shiftWindow:()=>true},next={shiftWindow:()=>true},finishes=[],w=Object.assign(Object.create(TopicController.prototype),{homeCollection:old,thoughtRootVisible:()=>true,captureHomeAnchor:()=>null,renderHomeReader:()=>new Promise(resolve=>finishes.push(resolve))});
 try{const a=w.shiftHomeWindow('next');assert.equal(w.homeWindowShift.collection,old);w.homeCollection=next;const b=w.shiftHomeWindow('next');assert.equal(w.homeWindowShift.collection,next);finishes[0](true);await a;assert.equal(w.homeWindowShifting,true);assert.equal(w.homeWindowShift.collection,next);finishes[1](true);await b;assert.equal(w.homeWindowShifting,false);}finally{globalThis.scrollY=priorY;}
});
test('D2 a completed hydration retry cannot advance the frontier of a superseded root route',async()=>{
 let finish,loads=0;const old={errorKind:'hydrate',loadNext(){loads++;}},w=Object.assign(Object.create(TopicController.prototype),{homeCollection:old,thoughtRootVisible:()=>true,captureHomeAnchor:()=>null,renderHomeReader:()=>new Promise(resolve=>finish=resolve)});const pending=w.loadHomeNext();w.homeCollection={};finish(false);await pending;assert.equal(loads,0);
});

test('D2 native focus-scroll exclusion is short, token-owned and cancelled by deliberate scrolling',()=>{
 const prior={requestAnimationFrame:globalThis.requestAnimationFrame,window:globalThis.window,document:globalThis.document,IntersectionObserver:globalThis.IntersectionObserver},frames=[],search={};let observe,calls=0;globalThis.requestAnimationFrame=fn=>frames.push(fn);globalThis.window={IntersectionObserver:true};globalThis.IntersectionObserver=class{constructor(fn){observe=fn;}disconnect(){}observe(){}};globalThis.document={activeElement:search,getElementById:id=>id==='thought-search'?search:{querySelectorAll:()=>[]}};const r={windowStart:40},w=Object.assign(Object.create(TopicController.prototype),{homeCollection:r,thoughtRootVisible:()=>true,topicScrollDirection:'previous',shiftHomeWindow(){calls++;}}),entry={isIntersecting:true,target:{dataset:{rootWindowTo:'39'}}};
 try{w.observeHomeWindow();w.beginHomeFocusScroll();observe([entry]);assert.equal(calls,0);w.cancelHomeFocusScroll();observe([entry]);assert.equal(calls,1,'wheel/touch/page intent is admitted even while search retains focus');w.beginHomeFocusScroll();frames.shift()();frames.shift()();assert.equal(w.homeFocusScrolling,true,'old focus cleanup cannot release newer focus intent');frames.shift()();frames.shift()();assert.equal(w.homeFocusScrolling,false);}finally{Object.assign(globalThis,prior);}
});

test('D2 page-scroll intent reuses scoped search keyboard owners without adding a document keyboard listener',()=>{
 const inputs=new Map(),results=new Map();let calls=0;wireSearchKeyboard({addEventListener:(name,fn)=>inputs.set(name,fn)},{addEventListener:(name,fn)=>results.set(name,fn)},{onScrollIntent:()=>calls++});inputs.get('keydown')({key:'PageDown'});results.get('keydown')({key:'PageUp'});assert.equal(calls,2);inputs.get('keydown')({key:'x'});inputs.get('keydown')({key:'PageDown',isComposing:true});assert.equal(calls,2);
});

test('D2 synthetic bulk reset removes its orphan filter queue rather than weakening root authority',async()=>{
 const {s}=await setup(OrganizerStore);await s.createTopic({name:'SYNTHETIC fixture root',operationId:op()});await s.repository.transaction(true,async t=>{for(const name of ['records','recordIndex','blocks','blockIndex','documents','libraryDocuments','sourceCounts','inputStates'])await t.clear(name);});const runner=new FilterRunner(s),first=await s.libraryIndexPage({mode:'stable'});assert.equal((await s.filterStatus()).pending,1);await runner.wake();assert.equal((await s.libraryIndexPage({mode:'stable',authority:first.authority})).cursorInvalid,true,'orphan progress still trips the full authority fence');await s.repository.transaction(true,async t=>{await t.clear('filterInputs');await t.clear('filterIntents');});const fixed=await s.libraryIndexPage({mode:'stable'});for(let i=0;i<3;i++){await runner.wake();assert.equal((await s.filterStatus()).pending,0);const page=await s.libraryIndexPage({mode:'stable',authority:fixed.authority});assert.equal(page.cursorInvalid,undefined);assert.equal(page.items.length,1);assert.equal(page.authority,fixed.authority);}
});
