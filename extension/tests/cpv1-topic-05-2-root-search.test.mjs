import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {OrganizerRunner} from '../core/organizer/runner.js';
import {DeterministicFixtureProvider} from './fixtures/organizer/provider.mjs';
import {ThoughtLibraryReadModel} from '../core/thought-library-read-model.js';
import {TopicController} from '../ui/topic-workspace.js';
import {completeFixture} from './harness/original-complete.mjs';
import {AI_FIELDS,AI_SCHEMA_VERSION} from '../core/organizer/ai-contract.js';
import {PersonalTopicRoot} from '../ui/personal-topic-root.js';
import {PresentationNode,presentationText} from './harness/presentation-dom.mjs';
import {readFile} from 'node:fs/promises';
const op=()=>crypto.randomUUID(),rows=(s,table)=>s.repository.transaction(false,t=>t.all(table));
async function indexed(s,query){await s.ensureLibrarySearch();await s.drainLibraryMaintenance();return s.libraryIndexPage({query,limit:40});}
test('TOPIC-05.2 Root search qualifies actual generated labels after Input exclusion and retains human-confirmed labels',async()=>{
 const {s}=await setup(OrganizerStore);await s.finishFoundation();const m=new ThoughtLibraryReadModel(s),input=(await s.snapshot()).library.blocks[0];
 await s.enqueueOrganizer({operationId:op(),specs:[{inputId:input.id,role:'primary',selectedFields:['body']}]});await new OrganizerRunner(s,{providers:[new DeterministicFixtureProvider(output=>{output.result[0].newTopic='SYNTHETIC SECRET TOPIC';output.result[0].newSection='SYNTHETIC SECRET SECTION';return output;})]}).step();
 let page=await indexed(s,'SECRET');assert.equal((await m.qualifySearchPage(page,'SECRET')).items.length,2);
 await s.excludeLibrary(input.id,true);page=await s.libraryIndexPage({query:'SECRET',limit:40});assert.ok(JSON.stringify(page).includes('SECRET'),'legacy lexical result alone is insufficient source qualification');
 const safe=await m.qualifySearchPage(page,'SECRET');assert.equal(safe.cursorInvalid,undefined);assert.deepEqual(safe.items,[]);assert.ok(!JSON.stringify(safe).includes('SECRET'));
 const topic=(await rows(s,'topics'))[0],section=(await rows(s,'sections')).find(row=>row.title==='SYNTHETIC SECRET SECTION');await s.editSection({topicId:topic.id,sectionId:section.sectionId,expectedRevision:section.revision,title:'SYNTHETIC SECRET human-confirmed Section',operationId:op()});
 page=await indexed(s,'SECRET');const human=await m.qualifySearchPage(page,'SECRET');assert.deepEqual(human.items.map(row=>row.sectionTitle),['SYNTHETIC SECRET human-confirmed Section']);
});
test('TOPIC-05.2 Root search validates current placement exclusions while retaining the canonical unassigned Entry',async()=>{
 const {s}=await setup(OrganizerStore),topic=await s.createTopic({name:'SYNTHETIC owner',operationId:op()}),entry=await s.continueThinking({topicId:topic.id,body:'SYNTHETIC NEEDLE unchanged body',operationId:op()}),m=new ThoughtLibraryReadModel(s);
 await indexed(s,'NEEDLE');await s.foundationWrite(async t=>{const id=JSON.stringify([topic.id,1,entry.id]),p=await t.get('placements',id);p.excludedByUser=true;await t.put('placements',p);});
 const page=await s.libraryIndexPage({query:'NEEDLE',limit:40});assert.equal(page.items[0].paths.length,1,'legacy active placement lookup does not resolve the exclusion flag');const result=await m.qualifySearchPage(page,'NEEDLE');assert.equal(result.items[0].entryId,entry.id);assert.deepEqual(result.items[0].paths,[]);assert.equal(result.items[0].snippet,page.items[0].snippet);assert.equal((await s.entry(entry.id)).body,'SYNTHETIC NEEDLE unchanged body');
});
test('TOPIC-05.2 Root search never attaches fresh authority to snippets read before an edit',async()=>{
 const {s}=await setup(OrganizerStore),topic=await s.createTopic({name:'SYNTHETIC owner',operationId:op()}),entry=await s.continueThinking({topicId:topic.id,body:'SYNTHETIC NEEDLE old private text',operationId:op()}),m=new ThoughtLibraryReadModel(s),page=await indexed(s,'NEEDLE');
 await s.editEntry({id:entry.id,expectedRevision:(await s.entry(entry.id)).revision,changes:{body:'SYNTHETIC replacement'},operationId:op()});const result=await m.qualifySearchPage(page,'NEEDLE');assert.equal(result.cursorInvalid,true);assert.equal(result.complete,false);assert.deepEqual(result.items,[]);assert.ok(!JSON.stringify(result).includes('old private text'));
});
test('TOPIC-05.2 Root search qualification does not mutate canonical rows, postings or index state',async()=>{
 const {s}=await setup(OrganizerStore),topic=await s.createTopic({name:'SYNTHETIC NEEDLE topic',operationId:op()}),m=new ThoughtLibraryReadModel(s);await s.continueThinking({topicId:topic.id,body:'SYNTHETIC NEEDLE expression',operationId:op()});const page=await indexed(s,'NEEDLE'),snapshot=()=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(s.repository.stores.map(async name=>[name,await t.all(name)])))),before=await snapshot(),original=s.repository.transaction.bind(s.repository);
 s.repository.transaction=(write,...args)=>{assert.equal(write,false);return original(write,...args);};try{const result=await m.qualifySearchPage(page,'NEEDLE');assert.equal(result.items.length,2);}finally{s.repository.transaction=original;}assert.deepEqual(await snapshot(),before);
});
test('TOPIC-05.2 failed or stale Root base hydration never publishes an empty complete extent',async()=>{
 for(const mode of ['stale','error']){
  const input={value:'NEEDLE'},prior=globalThis.document;globalThis.document={getElementById:()=>input};let rendered=0,cleared=0;
  const collection={terminal:true,loading:false,hydrateWindow:async()=>{if(mode==='stale')collection.stale=true;else collection.error=Error('SYNTHETIC replay failure');return false;},layout:()=>[]};
  const owner=Object.assign(Object.create(TopicController.prototype),{id:null,rootBaseCollection:collection,rootPreSearch:{items:[{id:'still-reserved'}],complete:true},personalRoot:{render:()=>rendered++,clear:()=>cleared++},onStatus:()=>{}});
  try{await owner.loadRootSearchBase();assert.equal(rendered,0);if(mode==='stale'){assert.deepEqual(owner.rootPreSearch.items,[]);assert.equal(owner.rootPreSearch.complete,false);}else assert.equal(owner.rootPreSearch.items[0].id,'still-reserved');assert.equal(cleared,mode==='stale'?1:0);}finally{globalThis.document=prior;}
 }
});
test('TOPIC-05.2 saved-AI matches retain the actual eligible identity/field contract without invented snippets',async()=>{
 const fixture=await completeFixture({texts:['继续']}),{s}=fixture;await s.evaluateFilters();await s.setFilterMode('off');await fixture.runner.wake();const topic=(await rows(s,'topics'))[0],entry=(await rows(s,'thoughts'))[0],m=new ThoughtLibraryReadModel(s);
 await s.foundationWrite(t=>t.put('meta',{id:'aiPresentation:'+topic.id,topicId:topic.id,schemaVersion:AI_SCHEMA_VERSION,revision:1,evidenceEntryIds:[entry.id],protections:{},...Object.fromEntries(AI_FIELDS.map(key=>[key,['blockSummary','currentView'].includes(key)?'':[]])),currentView:'SYNTHETIC_SAVED_FIELD_NEEDLE'}));
 const options={query:'SYNTHETIC_SAVED_FIELD_NEEDLE',cursor:{mode:'compact_root_search',query:'synthetic_saved_field_needle',phase:'ai',key:null}},page=await s.libraryIndexPage(options);assert.equal(page.items.length,1);assert.equal(page.items[0].snippet,undefined);
 const qualified=await m.qualifySearchPage(page,options.query);assert.equal(qualified.items.length,1);assert.equal(qualified.items[0].topicId,topic.id);assert.equal(qualified.items[0].aiField,'currentView');assert.equal(qualified.items[0].snippet,undefined);
 await s.setFilterMode('light');assert.equal((await m.qualifySearchPage(page,options.query)).cursorInvalid,true);const current=await s.libraryIndexPage(options);assert.deepEqual((await m.qualifySearchPage(current,options.query)).items,[]);
});
test('TOPIC-05.2 Root search keeps body previews in the existing privacy mask and a body-free open action',async()=>{
 const prior=globalThis.document,topicId='synthetic-topic',overview=new PresentationNode('div'),tile=new PresentationNode('article'),label=new PresentationNode('a');label.title='SYNTHETIC Topic';tile.querySelectorAll=selector=>selector==='.personal-root-search-extra'?[]:[label];tile.querySelector=()=>overview;let opened;
 globalThis.document={documentElement:{lang:'en'},createElement:tag=>new PresentationNode(tag),createTextNode:presentationText};
 try{
  const item={kind:'entry',entryId:'synthetic-entry',snippet:'SYNTHETIC_PRIVATE_NEEDLE',paths:[{topicId}]};PersonalTopicRoot.prototype.search.call({nodes:new Map([[topicId,tile]])},[item],'NEEDLE',{open:(...args)=>{opened=args;}});
  const action=overview.firstElementChild,[preview,masked]=action.children;assert.equal(preview.className,'personal-entry-preview');assert.equal(preview.textContent,item.snippet);assert.equal(masked.className,'personal-entry-mask-label');assert.equal(masked.textContent,'Content preview hidden · Open match');assert.equal(action.getAttribute('title'),null);assert.equal(action.getAttribute('aria-label'),null);assert.equal(label.textContent,label.title);action.listeners.get('click')();assert.deepEqual(opened,[item,item.paths[0]]);
  const css=await readFile(new URL('../ui/personal-topic-root.css',import.meta.url),'utf8');assert.match(css,/html\.paia-hide-content-previews \.personal-entry-preview\{display:none!important\}/);assert.match(css,/html\.paia-hide-content-previews \.personal-entry-mask-label\{display:block\}/);assert.doesNotMatch(css,/paia-hide-content-previews[^{}]*personal-(?:topic-link|section-link)/);
 }finally{globalThis.document=prior;}
});
test('TOPIC-05.2 native identity links leave text drags selectable and preserve normal and modified activation',()=>{
 const prior={document:globalThis.document,location:globalThis.location,getSelection:globalThis.getSelection},opened=[];let selected=false;
 globalThis.document={createElement:tag=>new PresentationNode(tag)};globalThis.location={href:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/ui/archive.html'};globalThis.getSelection=()=>({isCollapsed:!selected});
 try{
  const link=PersonalTopicRoot.prototype.link.call({open:(...args)=>opened.push(args)},'SYNTHETIC title','synthetic-topic','synthetic-section');assert.equal(link.draggable,false);assert.match(link.href,/#paia-thought\?topic=synthetic-topic&section=synthetic-section$/);
  let prevented=0;const click={button:0,detail:1,preventDefault:()=>prevented++};link.listeners.get('click')(click);assert.deepEqual(opened,[['synthetic-topic','synthetic-section']]);assert.equal(prevented,1);
  for(const modifiers of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{button:1}])link.listeners.get('click')({...click,...modifiers});assert.equal(prevented,1);assert.equal(opened.length,1,'native modified links retain browser navigation');
  selected=true;link.listeners.get('click')(click);assert.equal(prevented,2);assert.equal(opened.length,1,'finishing a text selection cannot activate the Topic');
 }finally{Object.assign(globalThis,prior);}
});

test('TOPIC-05.2 Root query preserves the validated reading anchor before search focus scrolls the page',()=>{
 const prior={document:globalThis.document,scrollY:globalThis.scrollY};
 globalThis.document={getElementById:()=>({value:'SYNTHETIC query'})};globalThis.scrollY=0;
 try{
  for(const stale of [false,true]){
   const saved={key:'item:deep-topic',id:'deep-topic',top:181},current={key:'item:first-topic',id:'first-topic',top:164};
   const collection={query:'',scope:'root',authority:'current-authority',keys:new Set([saved.key,current.key]),terminal:true,snapshot:()=>({items:[]}),releaseBodies(){}};
   const owner=Object.assign(Object.create(TopicController.prototype),{homeCollection:collection,homeReadingPosition:{scope:'root',authority:stale?'old-authority':'current-authority',anchor:saved},homePage:{page:{items:[]}},serial:0,captureHomeAnchor:()=>current,refresh:()=>assert.fail('timer must be cleared by fixture')});
   owner.searchRoot();clearTimeout(owner.searchTimer);
   assert.deepEqual(owner.rootPreSearch.anchor,stale?current:saved,stale?'stale remembered authority cannot restore an old identity':'focus-induced scrolling cannot replace the last actual reading position');
  }
 }finally{Object.assign(globalThis,prior);}
});
