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
import {TopicRootSlots} from '../ui/topic-root-slots.js';
import {PresentationNode,presentationText} from './harness/presentation-dom.mjs';
import {readFile} from 'node:fs/promises';
const op=()=>crypto.randomUUID(),rows=(s,table)=>s.repository.transaction(false,t=>t.all(table));
function searchDOM(topicId){
 const attach=node=>{node.querySelectorAll=selector=>{const selectors=selector.split(','),matches=child=>selectors.some(raw=>{const s=raw.trim();if(s.startsWith('.'))return s.slice(1).split('.').every(name=>child.classList.contains(name));if(s.startsWith('[data-'))return child.getAttribute(s.slice(1,-1))!==null;return child.tagName===s.toUpperCase();});return node.children.flatMap(child=>[...(matches(child)?[child]:[]),...child.querySelectorAll(selector)]);};node.querySelector=selector=>node.querySelectorAll(selector)[0]||null;return node;};
 const create=tag=>attach(new PresentationNode(tag)),host=create('div'),tile=create('article'),title=create('a'),overview=create('div'),more=create('a');
 tile.style={removeProperty(name){delete this[name];}};tile.getBoundingClientRect=()=>({height:322});
 title.className='personal-topic-link';title.title='SYNTHETIC NEEDLE Topic';title.dataset.topicId=topicId;overview.className='personal-topic-sections';more.className='personal-topic-more';tile.dataset.topicId=topicId;tile.append(title,overview,more);host.append(tile);
 const owner=Object.assign(Object.create(PersonalTopicRoot.prototype),{host,nodes:new Map([[topicId,tile]]),open:()=>{}});
 return {owner,host,tile,overview,create};
}
test('TOPIC-05.3 every qualified Topic Section and Entry match stays navigable in its original Topic slot',async()=>{
 const {s}=await setup(OrganizerStore),topic=await s.createTopic({name:'SYNTHETIC NEEDLE Topic',operationId:op()}),section=await s.createSection({topicId:topic.id,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,title:'SYNTHETIC NEEDLE Section',operationId:op()}),entries=[];
 for(const word of ['alpha','beta'])entries.push(await s.continueThinking({topicId:topic.id,body:'SYNTHETIC NEEDLE '+word,operationId:op()}));
 const model=new ThoughtLibraryReadModel(s),raw=await indexed(s,'NEEDLE'),page=await model.qualifySearchPage(raw,'NEEDLE');assert.deepEqual(page.items.map(row=>row.kind).sort(),['entry','entry','section','topic']);
 const previous={document:globalThis.document,location:globalThis.location,getSelection:globalThis.getSelection},dom=searchDOM(topic.id),opened=[],links=[];
 globalThis.document={documentElement:{lang:'en'},body:dom.host,createElement:dom.create,createTextNode:presentationText};globalThis.location={href:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/ui/archive.html'};globalThis.getSelection=()=>({isCollapsed:true});dom.owner.open=(...args)=>links.push(args);
 try{
  dom.owner.search(page.items,'NEEDLE',{open:(...args)=>opened.push(args),complete:true});
  assert.equal(dom.tile.style.height,'322px','search locks the ordinary measured rectangle');
  dom.tile.getBoundingClientRect=()=>({height:999});
  dom.owner.search(page.items,'NEEDLE',{open:(...args)=>opened.push(args),complete:true});
  assert.equal(dom.tile.style.height,'322px','result continuation does not measure its own projected height');
  assert.equal(dom.tile.querySelectorAll('[data-root-match-step]').length,2,'all four qualified hits need an explicit reachable step path');
  const kinds=[],step=()=>dom.tile.querySelector('[data-root-match-step]').listeners.get('click')();
  for(let i=0;i<4;i++){
   kinds.push(dom.tile.dataset.searchHitKind);
   const action=dom.overview.querySelector('[data-root-match-key]');if(action)action.listeners.get('click')({button:0,detail:0,preventDefault(){}});
   step();
  }
  assert.deepEqual(kinds.sort(),['entry','entry','section','topic']);assert.deepEqual(new Set(opened.map(([item])=>item.entryId)),new Set(entries.map(row=>row.id)));assert.deepEqual(links,[[topic.id,section.sectionId]]);
  assert.equal(dom.host.children.length,1);assert.equal(dom.host.firstElementChild,dom.tile,'stepping never repacks the Topic slot');assert.equal(dom.tile.querySelector('.personal-root-match-status').textContent,'1 / 4');
  assert.deepEqual((await s.entry(entries[0].id)).body,'SYNTHETIC NEEDLE alpha');
 }finally{Object.assign(globalThis,previous);}
});
test('TOPIC-05.3 loaded result continuation preserves selected identity and rejects obsolete open callbacks',()=>{
 const prior={document:globalThis.document,location:globalThis.location},dom=searchDOM('topic'),opened=[];
 globalThis.document={documentElement:{lang:'en'},body:dom.host,createElement:dom.create,createTextNode:presentationText};globalThis.location={href:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/ui/archive.html'};
 const item=id=>({kind:'entry',entryId:id,snippet:'SYNTHETIC NEEDLE '+id,paths:[{topicId:'topic',sectionId:'section'}]}),a=item('a'),b=item('b'),c=item('c'),paint=items=>dom.owner.search(items,'NEEDLE',{open:(value,path)=>opened.push([value.entryId,path.topicId])});
 try{
  paint([a,b]);dom.tile.querySelectorAll('[data-root-match-step]')[1].listeners.get('click')();const selected=dom.overview.querySelector('[data-root-match-key]');selected.focus();const focus=dom.owner.focusRef();assert.ok(focus.matchKey);assert.equal(dom.tile.querySelector('.personal-root-match-status').textContent,'2 / 2+');
  paint([c,a,b]);dom.owner.restoreFocus(focus);assert.equal(document.activeElement.dataset.rootMatchKey,focus.matchKey);assert.equal(dom.tile.querySelector('.personal-root-match-status').textContent,'3 / 3+');document.activeElement.listeners.get('click')();assert.deepEqual(opened,[['b','topic']]);
  paint([a,c]);selected.listeners.get('click')();assert.deepEqual(opened,[['b','topic']],'an old selected-body handler cannot open a removed qualified result');assert.equal(dom.tile.querySelector('.personal-root-match-status').textContent,'1 / 2+');
 }finally{Object.assign(globalThis,prior);}
});
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
 const prior=globalThis.document,topicId='synthetic-topic',overview=new PresentationNode('div'),tile=new PresentationNode('article'),label=new PresentationNode('a'),host=new PresentationNode('div');tile.append(label,overview);host.append(tile);tile.style={};tile.getBoundingClientRect=()=>({height:322});label.title='SYNTHETIC Topic';tile.querySelectorAll=selector=>selector==='.personal-root-search-extra'?[]:[label];tile.querySelector=()=>overview;let opened;
 globalThis.document={documentElement:{lang:'en'},body:host,createElement:tag=>new PresentationNode(tag),createTextNode:presentationText};
 try{
  const item={kind:'entry',entryId:'synthetic-entry',snippet:'SYNTHETIC_PRIVATE_NEEDLE',paths:[{topicId}]};PersonalTopicRoot.prototype.search.call(Object.assign(Object.create(PersonalTopicRoot.prototype),{host,nodes:new Map([[topicId,tile]])}),[item],'NEEDLE',{open:(...args)=>{opened=args;}});
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


test('TOPIC-05.3 active Entry AI and Section overlays survive same-column width layout without exposing original overview',()=>{
 const prior={document:globalThis.document,location:globalThis.location,getSelection:globalThis.getSelection,getComputedStyle:globalThis.getComputedStyle};
 try{
  globalThis.getComputedStyle=()=>({getPropertyValue:key=>{assert.equal(key,'--topic-root-columns');return '3';}});
  for(const kind of ['entry','ai','section']){
   const dom=searchDOM('topic');globalThis.document={documentElement:{lang:'en'},body:dom.host,createElement:dom.create,createTextNode:presentationText};globalThis.location={href:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/ui/archive.html'};globalThis.getSelection=()=>({isCollapsed:true});
   const ordinary=dom.create('a');ordinary.className='personal-section-link';ordinary.title='SYNTHETIC ordinary Section';ordinary.dataset.sectionId='ordinary';ordinary.getBoundingClientRect=()=>({height:32});dom.overview.append(ordinary);dom.overview.clientHeight=32;
   dom.host.style={setProperty(){}};dom.tile.style={removeProperty(key){delete this[key];}};dom.owner.columnCount=3;dom.host.clientWidth=1000;dom.owner.slots=new TopicRootSlots();dom.owner.items=[{id:'topic'}];dom.owner.complete=true;
   const result={kind,entryId:kind==='entry'?'entry':undefined,aiField:kind==='ai'?'currentView':undefined,snippet:'SYNTHETIC NEEDLE',topicId:'topic',sectionId:kind==='section'?'match':undefined,sectionTitle:kind==='section'?'SYNTHETIC NEEDLE Section':undefined,paths:kind==='entry'?[{topicId:'topic',sectionId:'match'}]:undefined};
   dom.owner.search([result,{kind:'topic',topicId:'topic',topicName:'SYNTHETIC NEEDLE Topic'}],'NEEDLE',{open(){},complete:true});
   const match=dom.overview.querySelector('[data-root-match-key]');match.getBoundingClientRect=()=>({height:32});match.focus();const key=dom.tile.dataset.searchHitKey;
   for(const width of [1000,980,1000]){dom.host.clientWidth=width;dom.owner.layout();assert.equal(dom.owner.columnCount,3);assert.equal(ordinary.hidden,true,kind+' cannot reveal the normal Section during search');assert.equal(match.hidden,false,kind+' match remains reachable');assert.equal(dom.tile.dataset.searchHitKey,key);assert.equal(document.activeElement,match,'layout does not steal exact match focus');assert.equal(dom.tile.dataset.rootSlot,'0');}
   delete dom.tile.dataset.searchState;dom.owner.fit(dom.tile);assert.equal(ordinary.hidden,false,'ordinary overview fitting resumes after search state clears');
  }
 }finally{Object.assign(globalThis,prior);}
});
test('TOPIC-05.3 obsolete Section callbacks reject repaint removal, new query and changed selected match for all native activations',()=>{
 const prior={document:globalThis.document,location:globalThis.location,getSelection:globalThis.getSelection};
 try{
  for(const mode of ['repaint','query','step']){
   const dom=searchDOM('topic'),opened=[];globalThis.document={documentElement:{lang:'en'},body:dom.host,createElement:dom.create,createTextNode:presentationText};globalThis.location={href:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/ui/archive.html'};globalThis.getSelection=()=>({isCollapsed:true});dom.owner.open=(...args)=>opened.push(args);
   const section={kind:'section',topicId:'topic',sectionId:'match',sectionTitle:'SYNTHETIC NEEDLE Section'},entry={kind:'entry',entryId:'entry',snippet:'SYNTHETIC NEEDLE',paths:[{topicId:'topic',sectionId:'match'}]};
   dom.owner.search([section,entry],'NEEDLE',{open(){},complete:true});const stale=dom.overview.querySelector('[data-root-match-key]');
   if(mode==='step')dom.tile.querySelectorAll('[data-root-match-step]')[1].listeners.get('click')();else dom.owner.search([entry],mode==='query'?'NEW':'NEEDLE',{open(){},complete:true});assert.equal(stale.isConnected,false);
   let prevented=0;for(const flags of [{},{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{button:1}])stale.listeners.get('click')({button:0,detail:0,preventDefault(){prevented++;},...flags});
   assert.deepEqual(opened,[],mode+' cannot call old Section navigation');assert.equal(prevented,6,mode+' cannot fall through to stale native href');
  }
 }finally{Object.assign(globalThis,prior);}
});
test('TOPIC-05.3 detached Root Entry and Section callbacks and match steps cannot reopen or repaint after navigation',()=>{
 const prior={document:globalThis.document,location:globalThis.location,getSelection:globalThis.getSelection};
 try{
  for(const kind of ['entry','section']){
   const dom=searchDOM('topic'),opened=[];globalThis.document={documentElement:{lang:'en'},body:dom.host,createElement:dom.create,createTextNode:presentationText};globalThis.location={href:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/ui/archive.html'};globalThis.getSelection=()=>({isCollapsed:true});dom.owner.open=(...args)=>opened.push(args);
   const entry={kind:'entry',entryId:'entry',snippet:'SYNTHETIC NEEDLE',paths:[{topicId:'topic',sectionId:'match'}]},section={kind:'section',topicId:'topic',sectionId:'match',sectionTitle:'SYNTHETIC NEEDLE Section'};
   dom.owner.search(kind==='entry'?[entry,section]:[section,entry],'NEEDLE',{open:(...args)=>opened.push(args),complete:true});const stale=dom.overview.querySelector('[data-root-match-key]'),step=dom.tile.querySelectorAll('[data-root-match-step]')[1],key=dom.tile.dataset.searchHitKey;
   dom.host.replaceChildren();assert.equal(stale.isConnected,false);stale.listeners.get('click')({button:0,detail:0,preventDefault(){}});step.listeners.get('click')();assert.deepEqual(opened,[]);assert.equal(dom.tile.dataset.searchHitKey,key,'old match step cannot repaint detached Root');
  }
 }finally{Object.assign(globalThis,prior);}
});

test('TOPIC-05.3 cycling back to the same Entry or Section key cannot reactivate its replaced control',()=>{
 const prior={document:globalThis.document,location:globalThis.location,getSelection:globalThis.getSelection};
 try{
  for(const kind of ['entry','section']){
   const dom=searchDOM('topic'),opened=[];globalThis.document={documentElement:{lang:'en'},body:dom.host,createElement:dom.create,createTextNode:presentationText};globalThis.location={href:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/ui/archive.html'};globalThis.getSelection=()=>({isCollapsed:true});dom.owner.open=(...args)=>opened.push(args);
   const entry={kind:'entry',entryId:'entry',snippet:'SYNTHETIC NEEDLE',paths:[{topicId:'topic',sectionId:'match'}]},section={kind:'section',topicId:'topic',sectionId:'match',sectionTitle:'SYNTHETIC NEEDLE Section'};
   dom.owner.search(kind==='entry'?[entry,section]:[section,entry],'NEEDLE',{open:(...args)=>opened.push(args),complete:true});const old=dom.overview.querySelector('[data-root-match-key]'),key=dom.tile.dataset.searchHitKey,next=dom.tile.querySelectorAll('[data-root-match-step]')[1];next.listeners.get('click')();next.listeners.get('click')();
   const current=dom.overview.querySelector('[data-root-match-key]');assert.equal(dom.tile.dataset.searchHitKey,key);assert.notEqual(current,old);assert.equal(old.isConnected,false);assert.equal(current.isConnected,true);
   let prevented=0;old.listeners.get('click')({button:0,detail:0,preventDefault(){prevented++;}});assert.deepEqual(opened,[],kind+' old action stays obsolete after a full match cycle');if(kind==='section')assert.equal(prevented,1);
   current.listeners.get('click')({button:0,detail:0,preventDefault(){}});assert.equal(opened.length,1,kind+' current replacement remains activatable');
  }
 }finally{Object.assign(globalThis,prior);}
});


test('TOPIC-05.3 existing live search status follows the grid and remains associated with the query outside hideable continuation',async()=>{
 const html=await readFile(new URL('../ui/archive.html',import.meta.url),'utf8'),root=html.slice(html.indexOf('<div id="thought-collection"'),html.indexOf('<article id="thought-document"'));
 assert.equal((html.match(/id="library-search-status"/g)||[]).length,1);assert.match(html,/<input id="thought-search"[^>]*aria-describedby="library-search-status"/);
 assert.match(root,/<div id="thought-list"><\/div><p id="library-search-status" role="status"><\/p>/);assert.ok(root.indexOf('id="thought-list"')<root.indexOf('id="library-search-status"'));assert.ok(root.indexOf('id="library-search-status"')<root.indexOf('id="thought-continuous-sentinel"'));
 const source=await readFile(new URL('../ui/topic-workspace.js',import.meta.url),'utf8');assert.match(source,/\$\('library-search-status'\)\.textContent=page\.indexing/);
});
test('TOPIC-05.3 actual Root search owner retains complete partial indexing and no-match status without touching the grid',()=>{
 const prior=globalThis.document,status={textContent:''},empty={hidden:false},searches=[];globalThis.document={getElementById:id=>id==='library-search-status'?status:id==='thought-empty'?empty:null};
 const owner=Object.assign(Object.create(TopicController.prototype),{rootPreSearch:null,personalRoot:{focusRef:()=>null,search:(items,query,options)=>searches.push({items,query,complete:options.complete})}}),hit={kind:'topic',topicId:'synthetic-topic'},cases=[
  [{items:[hit],complete:true},'匹配的主题已保留在原位置。'],[{items:[hit],complete:false},'继续读取其余匹配；主题位置保持不变。'],[{items:[],complete:false,indexing:true},'搜索索引正在准备，匹配尚未完整。'],[{items:[],complete:true},'当前没有匹配内容。'],[{items:[{kind:'entry',entryId:'synthetic-unplaced',paths:[]}],complete:true},'匹配位于单独写下的内容，可从更多操作打开。']
 ];
 try{for(const [page,text]of cases){owner.paintRootSearch(page,'SYNTHETIC');assert.equal(status.textContent,text);assert.equal(empty.hidden,true);assert.equal(searches.at(-1).items,page.items);assert.equal(searches.at(-1).complete,page.complete===true);}}finally{globalThis.document=prior;}
});

test('Root releases superseded permanent blank row reservations',()=>{
 const owner=Object.assign(Object.create(PersonalTopicRoot.prototype),{layoutWidth:1000,host:{clientWidth:1000,getClientRects:()=>[{}]}});
 owner.rememberRows();assert.equal(owner.rowHeights,undefined,'no old pixel rows are cached across removal');owner.clear=()=>{};owner.beginOrder();assert.equal(owner.rowHeights,undefined);
});

test('Root search locks displayed geometry before clearing preview text and retains only numeric geometry through paging',()=>{
 const prior={document:globalThis.document,location:globalThis.location,getSelection:globalThis.getSelection,getComputedStyle:globalThis.getComputedStyle};
 const dom=searchDOM('topic');let columns=3,updates=0,clears=0,natural=120;
 const style=()=>({removeProperty(key){delete this[key];}}),create=tag=>{const node=dom.create(tag);node.style=style();node.getBoundingClientRect=()=>({height:Number.parseFloat(node.style.height)||natural});node.replaceWith=next=>{node.parentElement.insertBefore(next,node);node.remove();};return node;};
 globalThis.document={documentElement:{lang:'en'},body:dom.host,createElement:create,createElementNS:(ns,tag)=>create(tag),createTextNode:presentationText};globalThis.location={href:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/ui/archive.html'};globalThis.getSelection=()=>({isCollapsed:true});globalThis.getComputedStyle=()=>({getPropertyValue:()=>String(columns)});
 try{
  const item={id:'topic',name:'SYNTHETIC NEEDLE Topic',sectionOverview:{items:[],complete:false}},body=create('p');body.className='personal-topic-preview';body.textContent='SYNTHETIC private preview';dom.tile.append(body);
  dom.tile.style.gridRow='263 / span 443';dom.tile.style.gridColumn='1';dom.tile.dataset.signature=JSON.stringify(['en',item.name,[],false]);dom.tile.dataset.overviewComplete='false';dom.tile.getBoundingClientRect=()=>({height:Number.parseFloat(dom.tile.style.height)||(body.textContent?443:natural)});dom.tile.replaceWith=next=>{dom.tile.parentElement.insertBefore(next,dom.tile);dom.tile.remove();};dom.host.style=style();dom.host.clientWidth=1000;
  Object.assign(dom.owner,{items:[item],complete:false,slots:new TopicRootSlots(),columnCount:3,layoutWidth:1000,previews:{clear(){clears++;body.replaceChildren();},release(){body.replaceChildren();},update(){updates++;}}});
  const hits=[{kind:'topic',topicId:'topic'},{kind:'entry',topicId:'topic',entryId:'entry',snippet:'SYNTHETIC NEEDLE match'}];
  dom.owner.render([item],{preserveSearch:true});
  assert.equal(dom.tile.style.gridRow,'263 / span 443','the first pre-search render preserves the displayed row before fitting');
  dom.owner.search(hits,'NEEDLE',{open(){}});
  assert.equal(body.textContent,'','private body is cleared synchronously');assert.equal(clears,1);assert.equal(dom.tile.style.height,'443px','lock precedes preview-driven shrink');
  dom.owner.render([item],{preserveSearch:true});dom.owner.search(hits,'NEEDLE',{open(){},complete:true});
  assert.equal(dom.tile.style.gridRow,'263 / span 443','same search page cannot compact the displayed row');assert.equal(dom.tile.style.height,'443px');assert.equal(updates,0,'search pagination cannot restart ordinary preview reads');
  dom.tile.querySelector('[data-root-match-step]').listeners.get('click')();const selected=dom.tile.dataset.searchHitKey;dom.host.clientWidth=980;dom.owner.layout();assert.equal(dom.tile.dataset.searchHitKey,selected);assert.equal(dom.tile.style.gridRow,'263 / span 443');assert.equal(body.textContent,'');dom.host.clientWidth=1000;dom.owner.layout();assert.equal(dom.tile.style.gridRow,'263 / span 443');assert.equal(dom.tile.style.height,'443px');
  dom.owner.search(hits,'new query',{open(){}});assert.equal(dom.owner.searchQuery,'new query');assert.equal(dom.tile.style.height,'443px','a new query replaces results without reviving preview text');
  columns=2;dom.owner.layout();assert.notEqual(dom.tile.style.gridRow,'263 / span 443','a changed column arrangement retires the old position');assert.equal(dom.tile.style.height,'120px','responsive layout measures current safe content afresh');
  dom.owner.render([{...item,name:'SYNTHETIC renamed'}],{preserveSearch:true});const replacement=dom.owner.nodes.get('topic');assert.notEqual(replacement,dom.tile);assert.equal(replacement.style.height,'120px','changed metadata cannot inherit stale height');assert.equal(dom.owner.searchGeometry.rows.get('topic').height,120);
  natural=180;dom.owner.render([{...item,name:'SYNTHETIC renamed'}]);assert.equal(replacement.style.height,undefined,'normal content-sized render removes the transient height');assert.equal(dom.owner.searchGeometry,null);assert.equal(updates,1);assert.equal(dom.owner.flowHeights.get('topic'),180,'normal flow grows to current content without permanent holes');
  dom.owner.search(hits,'again',{open(){}});dom.owner.clear();assert.equal(dom.owner.searchGeometry,null);assert.equal(dom.owner.nodes.size,0);assert.equal(dom.host.textContent,'');
 }finally{Object.assign(globalThis,prior);}
});

test('Root direct search snapshots every card before synchronous preview removal can shrink it',()=>{
 const prior=globalThis.document,dom=searchDOM('topic');let privateBody=true;
 globalThis.document={documentElement:{lang:'en'},body:dom.host,createElement:dom.create,createTextNode:presentationText};
 dom.tile.getBoundingClientRect=()=>({height:privateBody?443:366});dom.owner.previews={clear(){privateBody=false;}};
 try{dom.owner.search([],'NEEDLE',{open(){}});assert.equal(privateBody,false);assert.equal(dom.tile.style.height,'443px');assert.equal(dom.owner.searchGeometry.rows.get('topic').height,443);}finally{globalThis.document=prior;}
});

test('real Root controller freezes input geometry through held qualification, base hydration and search pagination',async()=>{
 const {PersonalTopicPreviews}=await import('../ui/personal-topic-previews.js');
 const prior=Object.fromEntries(['document','location','getSelection','getComputedStyle','scrollY','innerHeight','innerWidth'].map(key=>[key,globalThis[key]]));
 const dom=searchDOM('topic'),style=()=>({removeProperty(key){delete this[key];}}),pending=[];
 const create=tag=>{const node=dom.create(tag);node.style=style();node.getBoundingClientRect=()=>({height:Number.parseFloat(node.style.height)||120});node.replaceWith=next=>{node.parentElement.insertBefore(next,node);node.remove();};return node;};
 const query={value:'NEEDLE'},status={},empty={},unplaced={setAttribute(){}},errors=[];
 globalThis.document={documentElement:{lang:'en'},body:dom.host,hidden:false,createElement:create,createElementNS:(ns,tag)=>create(tag),createTextNode:presentationText,addEventListener(){},removeEventListener(){},getElementById:id=>({'thought-search':query,'library-search-status':status,'thought-empty':empty,'thought-list':dom.host,'library-unplaced-list':unplaced,'library-unplaced':unplaced}[id])};
 Object.assign(globalThis,{location:{href:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/ui/archive.html'},getSelection:()=>({isCollapsed:true}),getComputedStyle:()=>({getPropertyValue:()=> '3'}),scrollY:0,innerHeight:800,innerWidth:1000});
 let controller,previews;
 try{
  const item={id:'topic',name:'SYNTHETIC NEEDLE Topic',revision:1,organizationRevision:1,layoutGeneration:1,sectionOverview:{items:[],complete:false}},body=create('p');body.className='personal-topic-preview';Object.defineProperty(body,'childElementCount',{get:()=>body.children.length});dom.tile.append(body);
  dom.host.style=style();dom.host.clientWidth=1000;dom.tile.style.gridRow='263 / span 443';dom.tile.style.gridColumn='1';dom.tile.dataset.signature=JSON.stringify(['en',item.name,[],false]);dom.tile.dataset.overviewComplete='false';
  dom.tile.getBoundingClientRect=()=>({height:Number.parseFloat(dom.tile.style.height)||(body.textContent?443:366),width:300,top:100,bottom:543,left:0,right:300});
  Object.assign(dom.owner,{items:[item],complete:true,slots:new TopicRootSlots(),columnCount:3,layoutWidth:1000});
  previews=new PersonalTopicPreviews(dom.host,{nodes:()=>dom.owner.nodes,open(){},send:()=>new Promise(resolve=>pending.push(resolve))});dom.owner.previews=previews;previews.update([item]);body.append(create('button'));body.firstElementChild.textContent='SYNTHETIC private original';
  let hydrate;const collection={query:'',terminal:true,releaseBodies(){},snapshot:()=>({items:[{id:item.id}]}),hydrateWindow:()=>new Promise(resolve=>{hydrate=resolve;}),layout:()=>[{kind:'item',item}]};
  controller=Object.assign(Object.create(TopicController.prototype),{personalRoot:dom.owner,homeCollection:collection,homePage:{page:{items:[item]}},serial:0,previousHomeAnchor:()=>null,captureHomeAnchor:()=>null,thoughtRootVisible:()=>true,onStatus:(...args)=>errors.push(args),refresh:()=>assert.fail('fixture holds the debounce')});
  controller.searchRoot();clearTimeout(controller.searchTimer);
  assert.equal(body.textContent,'','input synchronously releases ordinary preview text before the held search');assert.equal(dom.tile.style.height,'443px');assert.equal(dom.owner.searchGeometry.rows.get('topic').row,'263 / span 443');
  pending[0]({kind:'root_previews',items:[{topicId:'topic',preview:{text:'SYNTHETIC late private original',sectionId:'section',entryId:'entry'}}]});await new Promise(resolve=>setImmediate(resolve));assert.equal(body.textContent,'','late eligibility cannot refill the search card');assert.equal(previews.items.length,0);
  const loading=controller.loadRootSearchBase();assert.equal(typeof hydrate,'function');assert.equal(dom.tile.style.gridRow,'263 / span 443');hydrate(true);await loading;
  assert.equal(dom.tile.style.gridRow,'263 / span 443','base hydration before the first result preserves original row');assert.equal(dom.tile.style.height,'443px');assert.equal(pending.length,1,'base hydration cannot restart ordinary body reads');
  const hits=[{kind:'topic',topicId:'topic'},{kind:'entry',topicId:'topic',entryId:'entry',snippet:'SYNTHETIC NEEDLE'}];
  for(const complete of [false,true]){controller.paintRootSearch({items:hits,complete},'NEEDLE');assert.equal(dom.tile.style.gridRow,'263 / span 443');assert.equal(dom.tile.style.height,'443px');assert.equal(body.textContent,'');}
  const readerBoundary=Symbol('reader installation');
  Object.assign(controller,{id:null,view:'original',rememberTimeline(){},rememberView(){},saveHomePosition(){},clearActionFeedback(){},timelinePositions:{get(){throw readerBoundary;}},leaveEditors:async()=>true});
  const originalGeometry=dom.owner.searchGeometry;controller.leaveEditors=async()=>false;assert.equal(await controller.open('topic'),undefined);assert.equal(dom.owner.searchGeometry,originalGeometry,'blocked departure preserves the live geometry and nodes');assert.equal(dom.owner.nodes.size,1);controller.leaveEditors=async()=>true;
  for(let visit=0;visit<5;visit++){
   const current=dom.owner.nodes.get('topic'),key=current.dataset.searchHitKey;
   await assert.rejects(controller.open('topic'),error=>error===readerBoundary);assert.equal(dom.owner.nodes.size,0,'actual open and successful leave release every card');assert.equal(dom.host.textContent,'','successful leave releases all result and preview text');assert.equal(previews.items.length,0);
   controller.id='topic';controller.id=null;controller.paintRootSearch({items:hits,complete:true},'NEEDLE');
   const returned=dom.owner.nodes.get('topic');assert.notEqual(returned,current);assert.equal(returned.style.height,'443px','Back reuses only qualified search geometry on fresh nodes');assert.equal(returned.style.gridRow,'263 / span 443');assert.equal(returned.dataset.searchHitKey,key);
   returned.querySelectorAll('[data-root-match-step]')[1].listeners.get('click')();assert.equal(returned.style.height,'443px','next match after each Back retains the original rectangle');
  }
  // Each mismatch starts from the same captured numeric fixture. None may
  // transfer a previous search rectangle onto newly admitted metadata.
  const geometry=dom.owner.searchGeometry,session=controller.rootSearchSession;
  for(const mismatch of ['query','session','metadata','width','columns','normal','clear','primary']){
   dom.owner.items=[item];dom.owner.searchQuery='NEEDLE';dom.owner.searchGeometry=geometry;dom.owner.columnCount=3;dom.host.clientWidth=1000;
   dom.owner.clear({searchSession:session});assert.equal(dom.owner.nodes.size,0);assert.equal(dom.host.textContent,'');
   let items=[item],options={preserveSearch:true,searchSession:session,query:'NEEDLE'};
   if(mismatch==='query')options.query='different';if(mismatch==='session')options.searchSession={};if(mismatch==='metadata')items=[{...item,revision:2}];if(mismatch==='width')dom.host.clientWidth=980;
   if(mismatch==='columns')dom.owner.suspendedSearchGeometry.columns=2;
   if(mismatch==='normal')options={};if(mismatch==='clear')dom.owner.clear();
   if(mismatch==='primary'){controller.homePositions=new Map();controller.resetHomeCollection=()=>{};controller.beginRootEntry();assert.equal(controller.rootSearchSession,null);}
   dom.owner.render(items,options);assert.notEqual(dom.owner.nodes.get('topic').style.height,'443px',mismatch+' cannot restore an obsolete rectangle');assert.equal(dom.owner.suspendedSearchGeometry,null);
  }
  dom.host.clientWidth=1000;controller.rootSearchSession=session;query.value='NEEDLE';dom.owner.render([item]);dom.owner.search(hits,'NEEDLE',{open(){}});
  controller.homeCollection={query:'NEEDLE',releaseBodies(){}};query.value='NEW';controller.searchRoot();clearTimeout(controller.searchTimer);assert.equal(dom.owner.nodes.get('topic').style.height,'120px');assert.equal(body.textContent,'');
  controller.rootBaseCollection=collection;collection.stale=true;const invalidated=controller.loadRootSearchBase();await invalidated;assert.deepEqual(errors,[['主题目录已变化，请重试读取。','read_error']]);assert.equal(dom.owner.nodes.size,0,'stale metadata clears the real root');assert.equal(dom.owner.searchGeometry,null);assert.equal(body.textContent,'');
  // A real source-scope change retires both an old Back reservation and an
  // already-held base hydration, even if the next source has identical metadata.
  query.value='NEEDLE';controller.id=null;controller.rootProviderKey='chatgpt';controller.rootSearchSession=session;controller.rootPreSearch={items:[item],complete:true};
  dom.owner.items=[item];dom.owner.searchQuery='NEEDLE';dom.owner.searchGeometry=geometry;dom.owner.columnCount=3;dom.owner.clear({searchSession:session});
  let releaseHydration,released=0,refreshed=0;const oldBase={terminal:true,releaseBodies(){released++;},hydrateWindow:()=>new Promise(resolve=>{releaseHydration=resolve;}),layout:()=>[{kind:'item',item}]};
  controller.rootBaseCollection=oldBase;controller.refresh=async()=>{refreshed++;};
  const oldRead=controller.loadRootSearchBase();assert.equal(typeof releaseHydration,'function');await controller.changeRootSourceScope('claude');
  assert.equal(controller.rootSearchSession,null,'source change retires the tab-local search identity');assert.equal(dom.owner.suspendedSearchGeometry,null,'source change drops old numeric Back geometry');assert.equal(controller.rootBaseCollection,null);assert.equal(released,1);assert.equal(refreshed,1);
  releaseHydration(true);await oldRead;assert.equal(controller.rootPreSearch,null,'old source hydration cannot refill metadata');assert.equal(dom.owner.nodes.size,0);assert.equal(dom.host.textContent,'');
  dom.owner.render([item],{preserveSearch:true,searchSession:session,query:'NEEDLE'});assert.notEqual(dom.owner.nodes.get('topic').style.height,'443px','same metadata in a different source does not revive old geometry');

 }finally{clearTimeout(controller?.searchTimer);previews?.dispose();Object.assign(globalThis,prior);}
});

test('actual metadata invalidation and ordinary Home repaint retain a renamed offscreen card without retaining its body',async()=>{
 const {PersonalTopicPreviews}=await import('../ui/personal-topic-previews.js');
 const prior=Object.fromEntries(['document','location','getSelection','getComputedStyle','innerWidth','innerHeight'].map(key=>[key,globalThis[key]])),dom=searchDOM('topic'),pending=[],ids=new Map();
 const create=tag=>{const n=dom.create(tag);n.style={removeProperty(key){delete this[key];}};n.getBoundingClientRect=()=>({height:0});return n;};
 for(const id of ['thought-search','library-search-status','thought-collection','thought-empty','thought-empty-settings','library-unplaced-list','unplaced-continuous-sentinel'])ids.set(id,create('div'));ids.get('thought-search').value='';ids.get('library-unplaced-list').hidden=true;
 globalThis.document={body:dom.host,documentElement:{lang:'en'},hidden:false,getElementById:id=>ids.get(id),querySelectorAll:()=>[],createElement:create,createElementNS:(ns,tag)=>create(tag),createTextNode:presentationText,addEventListener(){},removeEventListener(){}};
 Object.assign(globalThis,{location:{href:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/ui/archive.html'},getSelection:()=>({isCollapsed:true}),getComputedStyle:()=>({getPropertyValue:()=> '3'}),innerWidth:1000,innerHeight:800});
 let previews;
 try{
  let top=10;const body=create('p');body.className='personal-topic-preview';Object.defineProperty(body,'childElementCount',{get:()=>body.children.length});body.getBoundingClientRect=()=>({height:body.childElementCount?77.375:Number.parseFloat(body.style.minHeight)||0});dom.tile.append(body);
  dom.tile.getBoundingClientRect=()=>({height:365.5625+body.getBoundingClientRect().height,width:300,top,bottom:top+443,left:0,right:300});dom.host.style={};dom.host.clientWidth=1000;
  const item={id:'topic',name:'SYNTHETIC NEEDLE Topic',revision:1,sectionOverview:{items:[],complete:false}};dom.tile.dataset.signature=JSON.stringify(['en',item.name,[],false]);
  Object.assign(dom.owner,{items:[item],slots:new TopicRootSlots(),columnCount:3,layoutWidth:1000});previews=new PersonalTopicPreviews(dom.host,{nodes:()=>dom.owner.nodes,open(){},send:()=>new Promise(resolve=>pending.push(resolve))});dom.owner.previews=previews;
  previews.update([item]);pending[0]({kind:'root_previews',items:[{topicId:'topic',preview:{text:'SYNTHETIC original',sectionId:'section',entryId:'entry'}}]});await new Promise(resolve=>setImmediate(resolve));dom.owner.layout();const before=dom.tile.getBoundingClientRect().height;
  const controller=Object.assign(Object.create(TopicController.prototype),{personalRoot:dom.owner,homePositions:new Map(),thoughtRootVisible:()=>true,captureHomeAnchor:()=>null});
  controller.invalidateHomeSnapshot({cause:'EDIT_LIBRARY_TOPIC'});previews.changed({type:'ARCHIVE_CHANGED',cause:'EDIT_LIBRARY_TOPIC'});assert.equal(body.textContent,'');assert.equal(pending.length,1,'publication cannot read the old directory revision');top=1000;void previews.refresh();assert.equal(pending.length,1,'viewport change while hydration is pending cannot read stale references');assert.equal(dom.tile.getBoundingClientRect().height,before);
  controller.paintHome({items:[{...item,name:'SYNTHETIC renamed 中文',revision:2}],complete:true},'');assert.equal(dom.owner.nodes.get('topic'),dom.tile,'name-only rename preserves the identity DOM');assert.equal(dom.tile.querySelector('.personal-topic-link').title,'SYNTHETIC renamed 中文');assert.equal(dom.tile.getBoundingClientRect().height,before,'ordinary repaint retains the previously measured preview shell');assert.equal(body.textContent,'');
  controller.invalidateHomeSnapshot({cause:'REMOVE_LIBRARY_TOPIC'});assert.equal(dom.owner.nodes.size,0);assert.equal(body.style.minHeight,'');assert.equal(body.textContent,'','removal leaves neither bodies nor permanent blank reservations');
 }finally{previews?.dispose();Object.assign(globalThis,prior);}
});

test('actual Root capture clear repaint and Back restore the activated identity across independent column geometry',async()=>{
 const keys=['document','location','getSelection','getComputedStyle','innerWidth','innerHeight','requestAnimationFrame','scrollBy'],prior=Object.fromEntries(keys.map(key=>[key,globalThis[key]])),dom=searchDOM('a'),frames=[];
 let position=0,repaint=false;const create=tag=>{const n=dom.create(tag);n.style={removeProperty(key){delete this[key];}};n.getBoundingClientRect=()=>{const top=(n.dataset.topicId==='b'?(repaint?5100:240):(repaint?5000:180))-position;return {top,bottom:top+100,height:100,width:300,left:0,right:300};};return n;};
 const input={value:''},unplaced=create('div');unplaced.hidden=true;globalThis.document={body:dom.host,documentElement:{lang:'en'},hidden:false,querySelectorAll:()=>[],getElementById:id=>id==='thought-list'?dom.host:id==='library-unplaced-list'?unplaced:id==='unplaced-continuous-sentinel'?create('div'):input,createElement:create,createElementNS:(_,tag)=>create(tag),createTextNode:presentationText,addEventListener(){},removeEventListener(){}};
 Object.assign(globalThis,{location:{href:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/ui/archive.html'},getSelection:()=>({isCollapsed:true}),getComputedStyle:()=>({getPropertyValue:()=> '3'}),innerWidth:1000,innerHeight:800,requestAnimationFrame:fn=>frames.push(fn),scrollBy:(_,y)=>position+=y});
 try{
  dom.owner.nodes.clear();dom.host.replaceChildren();dom.host.style={};dom.host.clientWidth=1000;dom.owner.slots=new TopicRootSlots();dom.owner.items=[];
  const items=['a','b'].map(id=>({id,name:id,revision:1,sectionOverview:{items:[],complete:true}}));dom.owner.render(items,{complete:true});
  const target=dom.owner.nodes.get('b'),link=target.querySelector('.personal-topic-link');link.focus();target.querySelector('.personal-topic-preview').append(create('span'));target.querySelector('.personal-topic-preview').children.at(-1).textContent='SYNTHETIC private';
  const controller=Object.assign(Object.create(TopicController.prototype),{personalRoot:dom.owner,id:null,serial:1,homePositions:new Map(),thoughtRootVisible:()=>true,homeCollection:{scope:'root',authority:'A',keys:new Set(['item:a','item:b']),reset(){}}});
  const anchor=controller.captureHomeAnchor();controller.clearHomeRows();assert.equal(dom.owner.nodes.size,0);assert.equal(target.querySelector('.personal-topic-preview').textContent,'','departure releases preview text synchronously');
  repaint=true;dom.owner.render(items,{complete:true});controller.restoreHomeAnchor(anchor);while(frames.length)frames.shift()();
  assert.equal(dom.owner.nodes.get('b').getBoundingClientRect().top,240,'activated Topic keeps its own viewport coordinate, not another column anchor');assert.equal(document.activeElement.dataset.topicId,'b');
  // The same ordinary owner also handles a real delete/restore invalidation,
  // without retaining nodes, bodies, or reserving the deleted identity's hole.
  for(const cause of ['REMOVE_LIBRARY_TOPIC','RESTORE_LIBRARY_TOPIC']){
   const savedTop=dom.owner.nodes.get('b').getBoundingClientRect().top;
   controller.invalidateHomeSnapshot({cause});assert.equal(dom.owner.nodes.size,0);const restore=controller.rootInvalidationAnchor;assert.equal(restore.id,'b');
   dom.owner.render(cause==='REMOVE_LIBRARY_TOPIC'?items.slice(1):items,{complete:true});controller.homeCollection={scope:'root',authority:'A',keys:new Set(['item:a','item:b']),reset(){}};controller.restoreHomeAnchor(restore);while(frames.length)frames.shift()();
   assert.equal(dom.owner.nodes.get('b').getBoundingClientRect().top,savedTop);assert.equal(document.activeElement.dataset.topicId,'b');
  }
  // No visible focused Topic: fall back to the actual first visible reading row.
  position=4900;document.activeElement=input;assert.equal(controller.captureHomeAnchor().id,'a');
 }finally{dom.owner.previews?.dispose();Object.assign(globalThis,prior);}
});

test('held preview after Back RAFs uses actual Root resize layout without overriding later reader intent',async()=>{
 const {PersonalTopicPreviews}=await import('../ui/personal-topic-previews.js');
 const keys=['document','location','getSelection','getComputedStyle','innerWidth','innerHeight','requestAnimationFrame','scrollBy','scrollY','ResizeObserver'],prior=Object.fromEntries(keys.map(k=>[k,globalThis[k]])),dom=searchDOM('a'),frames=[],pending=[];let resized,root,controller;
 const create=tag=>{const n=dom.create(tag);n.style={removeProperty(k){delete this[k];}};Object.defineProperty(n,'childElementCount',{get:()=>n.children.length});n.closest=()=>n.classList.contains('personal-topic-block')?n:n.parentElement?.closest?.('.personal-topic-block');n.getBoundingClientRect=()=>{const card=n.classList.contains('personal-topic-block'),height=card?100+(n.querySelector('.personal-topic-preview')?.childElementCount?77:0):0,top=200+(parseInt(n.style.gridRow)||1)-1-globalThis.scrollY;return{height,top,bottom:top+height,width:300,left:0,right:300};};return n;};
 const input={value:''};globalThis.document={body:dom.host,documentElement:{lang:'en'},hidden:false,getElementById:id=>id==='thought-list'?dom.host:input,createElement:create,createElementNS:(_,tag)=>create(tag),createTextNode:presentationText,addEventListener(){},removeEventListener(){}};
 Object.assign(globalThis,{location:{href:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/ui/archive.html'},getSelection:()=>({isCollapsed:true}),getComputedStyle:()=>({getPropertyValue:()=> '1'}),innerWidth:1000,innerHeight:800,scrollY:0,requestAnimationFrame:fn=>frames.push(fn),scrollBy:(_,y)=>globalThis.scrollY+=y,ResizeObserver:class{constructor(fn){resized=fn;}observe(){}unobserve(){}disconnect(){}}});
 try{
  dom.host.replaceChildren();dom.host.style={};dom.host.clientWidth=1000;dom.host.getClientRects=()=>[{}];
  root=new PersonalTopicRoot(dom.host,{open(){},onResize:()=>controller?.resizeHomeAnchor?.()});root.previews=new PersonalTopicPreviews(dom.host,{nodes:()=>root.nodes,open(){},send:()=>new Promise(resolve=>pending.push(resolve))});
  const items=['a','b'].map(id=>({id,name:id,revision:1,sectionOverview:{items:[],complete:true}}));root.render(items,{complete:true});
  controller=Object.assign(Object.create(TopicController.prototype),{personalRoot:root,id:null,serial:1,homeCollection:{scope:'root',authority:'A',keys:new Set(['item:a','item:b'])}});
  root.nodes.get('b').querySelector('.personal-topic-link').focus();const anchor=controller.captureHomeAnchor();controller.restoreHomeAnchor(anchor);while(frames.length)frames.shift()();
  pending.shift()({kind:'root_previews',items:[{topicId:'a',preview:{text:'SYNTHETIC held original',sectionId:'s',entryId:'e'}}]});await new Promise(resolve=>setImmediate(resolve));
  resized([{target:root.nodes.get('a')}]);while(frames.length)frames.shift()();assert.equal(root.nodes.get('b').getBoundingClientRect().top,anchor.top,'late qualified body and actual layout preserve the restored identity');assert.equal(document.activeElement.dataset.topicId,'b');
  for(const fence of ['scroll','input','route','collection','serial','width']){
   controller.id=null;controller.serial=1;dom.host.clientWidth=1000;controller.homeCollection={scope:'root',authority:'A',keys:new Set(['item:a','item:b'])};controller.restoreHomeAnchor(controller.captureHomeAnchor());while(frames.length)frames.shift()();
   if(fence==='scroll')globalThis.scrollY+=30;if(fence==='input')controller.cancelHomeFocusScroll();if(fence==='route')controller.id='reader';if(fence==='collection')controller.homeCollection={};if(fence==='serial')controller.serial++;if(fence==='width')dom.host.clientWidth=900;
   const before=globalThis.scrollY;root.nodes.get('a').querySelector('.personal-topic-preview').replaceChildren();resized([{target:root.nodes.get('a')}]);while(frames.length)frames.shift()();assert.equal(globalThis.scrollY,before,fence+' invalidates delayed correction');
   root.nodes.get('a').querySelector('.personal-topic-preview').append(create('span'));root.layout();
  }
 }finally{root?.previews?.dispose();Object.assign(globalThis,prior);}
});

test('actual outer leave then open keeps the Root departure identity for repeated Forward and Back',async()=>{
 const keys=['document','location','getSelection','getComputedStyle','innerWidth','innerHeight','requestAnimationFrame','scrollBy','scrollY','scrollTo','chrome','window'],prior=Object.fromEntries(keys.map(k=>[k,globalThis[k]])),dom=searchDOM('a'),frames=[];
 const create=tag=>{const n=dom.create(tag);n.style={removeProperty(k){delete this[k];}};n.getBoundingClientRect=()=>({top:5240-globalThis.scrollY,bottom:5340-globalThis.scrollY,height:100,width:300,left:0,right:300});return n;};
 const nodes=new Map(),get=id=>{if(id==='thought-list')return dom.host;if(!nodes.has(id)){const n=create('div');n.value='';nodes.set(id,n);}return nodes.get(id);};
 globalThis.document={body:dom.host,documentElement:{lang:'en'},hidden:false,getElementById:get,createElement:create,createElementNS:(_,tag)=>create(tag),createTextNode:presentationText,addEventListener(){},removeEventListener(){}};
 Object.assign(globalThis,{location:{href:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/ui/archive.html'},getSelection:()=>({isCollapsed:true}),getComputedStyle:()=>({getPropertyValue:()=> '3'}),innerWidth:1000,innerHeight:800,scrollY:5000,requestAnimationFrame:fn=>frames.push(fn),scrollBy:(_,y)=>globalThis.scrollY+=y,scrollTo:(_,y)=>globalThis.scrollY=y,chrome:{runtime:{sendMessage:async()=>({ok:true,data:null})}},window:globalThis});
 let controller;
 try{
  dom.owner.nodes.clear();dom.host.replaceChildren();dom.host.style={};dom.host.clientWidth=1000;dom.owner.slots=new TopicRootSlots();dom.owner.items=[];
  const items=[{id:'a',name:'SYNTHETIC identity',revision:1,sectionOverview:{items:[],complete:true}}];
  const collection=()=>({scope:'root',authority:'A',keys:new Set(['item:a']),items:[{key:'item:a',id:'a'}],snapshot:()=>({items:[{key:'item:a',id:'a'}]}),restore(){},releaseBodies(){}});
  controller=Object.assign(Object.create(TopicController.prototype),{personalRoot:dom.owner,id:null,serial:1,view:'original',homePositions:new Map(),homeCollection:collection(),rememberTimeline(){},rememberView(){},leaveEditors:async()=>{controller.serial++;return true;},clearActionFeedback(){},timelinePositions:{get:()=>null},aiTopics:new Map(),aiViewSession:{view:()=> 'original',position:()=>null},onOpen(){},restoreContent(){},topicAnchor:()=>null,schedulePosition(){},createHomeCollection:collection,homeCollectionScope:()=> 'root',async refresh(){if(!this.id){this.paintHome({items,complete:true},'');this.restoreHomeAnchor(this.rootInvalidationAnchor);}return true;}});
  const {default:vm}=await import('node:vm'),source=await readFile(new URL('../ui/archive.js',import.meta.url),'utf8'),leaveSource=source.slice(source.indexOf('async function leave('),source.indexOf('\nlet navigationIntent=')),outer={thoughts:controller,view:'thoughts',topicActions:{leave:()=>true},serial:0,partHistory:null,editor:null,documentId:null,routeStates:new Map(),query:'',pageCursor:null,pageHistory:[],window:globalThis};vm.createContext(outer);vm.runInContext(leaveSource+';this.leave=leave;',outer);
  for(let trip=0;trip<3;trip++){
   dom.owner.render(items,{complete:true});globalThis.scrollY=5000+trip*10;dom.owner.nodes.get('a').querySelector('.personal-topic-link').focus();const top=dom.owner.nodes.get('a').getBoundingClientRect().top;
   // Actual AppShell navigation calls leave before TopicController.open. Its
   // synchronous release also removes the native focused link and clamps scroll.
   await outer.leave();assert.equal(dom.owner.nodes.size,0);document.activeElement=dom.host;globalThis.scrollY=0;
   await controller.open('a');assert.equal(controller.id,'a');
   const saved=controller.homePositions.get('home');assert.equal(saved.rootAnchor?.id,'a','double departure cannot replace the live anchor with null');assert.equal(saved.scroll,5000+trip*10);assert.equal(saved.rootAnchor.focusRef.topicId,'a');
   await outer.leave();await controller.open(null);while(frames.length)frames.shift()();assert.equal(saved.returnGeometry,undefined,'actual open consumes the saved return snapshot');assert.equal(controller.rootReturnGeometry,null,'actual paint consumes the staged return snapshot');assert.equal(dom.owner.nodes.get('a').getBoundingClientRect().top,top);assert.equal(document.activeElement.dataset.topicId,'a');
  }
  const saved=controller.homePositions.get('home');controller.leaveEditors=async()=>false;await controller.leave();assert.equal(controller.homePositions.get('home'),saved,'blocked departure cannot replace the committed position');assert.equal(dom.owner.nodes.size,1);
  for(const change of ['source','collection','intent','id','newer-leave','open-source']){
   controller.id=null;controller.homeCollection=collection();controller.rootProviderKey='old';dom.owner.render(items,{complete:true});dom.owner.nodes.get('a').querySelector('.personal-topic-link').focus();
   const committed=controller.homePositions.get('home');let release;controller.leaveEditors=()=>new Promise(resolve=>release=resolve);const pending=change==='open-source'?controller.open('a'):controller.leave();
   if(change==='source'||change==='open-source')controller.rootProviderKey='new';if(change==='collection')controller.homeCollection=collection();if(change==='id')controller.id='different';if(change==='intent')controller.openIntent=(controller.openIntent||0)+1;if(change==='newer-leave'){controller.leaveEditors=async()=>false;await controller.leave();}
   release(true);await pending;assert.equal(dom.owner.nodes.size,1,change+' obsolete departure cannot clear the current Root');assert.equal(controller.homePositions.get('home'),committed,change+' cannot overwrite the committed departure');assert.equal(controller.id,change==='id'?'different':null);
  }
  controller.id=null;controller.homeCollection=collection();dom.owner.render(items,{complete:true});dom.owner.nodes.get('a').querySelector('.personal-topic-link').focus();
  const releases=[];controller.leaveEditors=()=>new Promise(resolve=>releases.push(resolve));const earlier=controller.open('a'),latest=controller.open('newer');releases[0](true);await earlier;assert.equal(controller.id,null);assert.equal(dom.owner.nodes.size,1,'obsolete concurrent open cannot clear before current flush succeeds');releases[1](true);await latest;assert.equal(controller.id,'newer');assert.equal(dom.owner.nodes.size,0);
  for(const change of ['scroll','input']){
   controller.id=null;
   controller.homeCollection=collection();dom.owner.render(items,{complete:true});globalThis.scrollY=5000;dom.owner.nodes.get('a').querySelector('.personal-topic-link').focus();let release;controller.leaveEditors=()=>new Promise(resolve=>release=resolve);const pending=controller.leave();
   globalThis.scrollY=5070;if(change==='input')controller.cancelHomeAnchor();const currentTop=dom.owner.nodes.get('a').getBoundingClientRect().top;release(true);assert.equal(await pending,true);const latest=controller.homePositions.get('home');assert.equal(latest.scroll,5070);assert.equal(latest.rootAnchor.top,currentTop,change+' captures current intent after awaited flush');assert.equal(dom.owner.nodes.size,0);
  }
  controller.beginRootEntry();assert.equal(controller.homePositions.has('home'),false,'ordinary Home starts a fresh route, not a saved Forward return');
 }finally{dom.owner.previews?.dispose();Object.assign(globalThis,prior);}
});

test('ordinary Back restores both independent-column anchors using only qualified measured preview heights',async()=>{
 const {PersonalTopicPreviews}=await import('../ui/personal-topic-previews.js');
 const keys=['document','location','getSelection','getComputedStyle','innerWidth','innerHeight','requestAnimationFrame','scrollBy','scrollY'],prior=Object.fromEntries(keys.map(k=>[k,globalThis[k]])),dom=searchDOM('a'),frames=[],pending=[];let previews,columns=2;
 const create=tag=>{const n=dom.create(tag);n.replaceWith=other=>{n.parentElement?.insertBefore(other,n);n.remove();};n.style={removeProperty(k){delete this[k];}};Object.defineProperty(n,'childElementCount',{get:()=>n.children.length});n.getBoundingClientRect=()=>{const preview=n.classList.contains('personal-topic-preview'),ph=preview?(n.children.length?61:Number.parseFloat(n.style.minHeight)||0):0,p=n.querySelector('.personal-topic-preview'),height=preview?ph:94+(p?.getBoundingClientRect().height? p.getBoundingClientRect().height+16:0),top=200+(parseInt(n.style.gridRow)||1)-1-globalThis.scrollY;return {top,bottom:top+height,height,width:300,left:0,right:300};};return n;};
 const controls=new Map(),get=id=>{if(id==='thought-list')return dom.host;if(!controls.has(id)){const n=create('div');n.value='';controls.set(id,n);}return controls.get(id);};
 globalThis.document={body:dom.host,documentElement:{lang:'en'},hidden:false,getElementById:get,createElement:create,createElementNS:(_,tag)=>create(tag),createTextNode:presentationText,addEventListener(){},removeEventListener(){}};
 Object.assign(globalThis,{location:{href:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/ui/archive.html'},getSelection:()=>({isCollapsed:true}),getComputedStyle:()=>({getPropertyValue:()=>String(columns)}),innerWidth:1000,innerHeight:720,scrollY:0,requestAnimationFrame:fn=>frames.push(fn),scrollBy:(_,y)=>globalThis.scrollY+=y});
 try{
  dom.owner.nodes.clear();dom.host.replaceChildren();dom.host.style={};dom.host.clientWidth=1000;dom.owner.slots=new TopicRootSlots();dom.owner.items=[];
  previews=new PersonalTopicPreviews(dom.host,{nodes:()=>dom.owner.nodes,open(){},send:()=>new Promise(resolve=>pending.push(resolve))});dom.owner.previews=previews;
  const items=[...'abcdefghij'].map(id=>({id,name:'SYNTHETIC LABEL '+id,revision:1,organizationRevision:1,layoutGeneration:1,sectionOverview:{items:[],complete:true}}));dom.owner.render(items,{complete:true});pending.shift()({kind:'root_previews',items:[{topicId:'a',preview:{text:'SYNTHETIC PRIVATE BODY',sectionId:'s',entryId:'e'}}]});await new Promise(resolve=>setImmediate(resolve));dom.owner.layout();
  globalThis.scrollY=571;void previews.refresh();assert.equal(dom.owner.nodes.get('a').querySelector('.personal-topic-preview').textContent,'');assert.equal(dom.owner.nodes.get('a').querySelector('.personal-topic-preview').style.minHeight,'61px');pending.shift()({kind:'root_previews',items:[]});await new Promise(resolve=>setImmediate(resolve));dom.owner.layout();
  const collection={authority:'A',scope:'root',keys:new Set(items.map(x=>'item:'+x.id)),snapshot:()=>({items:items.map(({id})=>({id,key:'item:'+id}))})};
  const controller=Object.assign(Object.create(TopicController.prototype),{personalRoot:dom.owner,homeCollection:collection,homePositions:new Map(),id:null,serial:1,openIntent:1,view:'original',rememberTimeline(){},rememberView(){},leaveEditors:async()=>true});
  const first=()=>[...dom.owner.nodes.values()].find(n=>{const r=n.getBoundingClientRect();return r.bottom>120&&r.top<innerHeight;});
  dom.owner.nodes.get('j').querySelector('.personal-topic-link').focus();const before={first:first().dataset.topicId,firstTop:first().getBoundingClientRect().top,clickedTop:dom.owner.nodes.get('j').getBoundingClientRect().top};assert.equal(before.first,'g');
  for(let visit=0;visit<3;visit++){
   await controller.leave();assert.equal(dom.owner.nodes.size,0);assert.equal(dom.host.textContent,'');const saved=controller.homePositions.get('home'),returned=saved.returnGeometry;assert.doesNotMatch(JSON.stringify(returned||null),/PRIVATE BODY|SYNTHETIC LABEL|childNodes|textContent/);delete saved.returnGeometry;
   controller.rootReturnGeometry={...returned,intent:controller.openIntent,inputEpoch:controller.homeAnchorInputEpoch||0,scroll:globalThis.scrollY||0};controller.paintHome({items,complete:true},'');controller.restoreHomeAnchor(saved.rootAnchor);while(frames.length)frames.shift()();
   assert.equal(first().dataset.topicId,before.first);assert.equal(controller.rootReturnGeometry,null,'first real paint consumes the return exactly once');assert.equal(first().getBoundingClientRect().top,before.firstTop,'original first-visible anchor retains its offset');assert.equal(returned.geometry.rows.length,1,'only one measured nonzero shell is retained');assert.equal(dom.owner.nodes.get('j').getBoundingClientRect().top,before.clickedTop,'activated anchor also retains its offset');assert.equal(document.activeElement.dataset.topicId,'j');assert.equal(dom.owner.nodes.get('a').querySelector('.personal-topic-preview').textContent,'');
  }
  // Search starts from the real returned multi-column viewport, then clears
  // through the controller and hydration owner, rather than root.render alone.
  Object.assign(collection,{query:'',terminal:true,releaseBodies(){},restore(){},state:()=>({}),hydrateWindow:async()=>true});
  controller.createHomeCollection=()=>({...collection});controller.homePageState=()=>({items,complete:true});controller.updateHomeContinuous=()=>{};controller.readKey=()=> 'root';
  for(let round=0;round<3;round++){
  controller.homePage={page:{items}};get('thought-search').value='SYNTHETIC';controller.searchRoot();clearTimeout(controller.searchTimer);
  assert.equal(dom.owner.nodes.get('a').querySelector('.personal-topic-preview').textContent,'','search releases ordinary preview text immediately');
  controller.paintRootSearch({items:[],complete:true},'SYNTHETIC');
  get('thought-search').value='';controller.searchRoot();clearTimeout(controller.searchTimer);await controller.renderHomeReader(controller.rootInvalidationAnchor);while(frames.length)frames.shift()();
  assert.equal(first().dataset.topicId,before.first,'clearing search restores the original first-visible identity');assert.equal(first().getBoundingClientRect().top,before.firstTop,'clearing search preserves the original independent-column offset');assert.equal(dom.owner.nodes.get('j').getBoundingClientRect().top,before.clickedTop);
  assert.equal(controller.rootPreSearch,null,'clear consumes the sole pre-search snapshot');assert.equal(dom.owner.searchQuery,'','ordinary mode has no stale search identity');
  }
  // A genuine later wheel/input wins over an in-flight clear-search restore.
  controller.homeCollection=collection;controller.homePage={page:{items}};get('thought-search').value='SYNTHETIC';controller.searchRoot();clearTimeout(controller.searchTimer);controller.paintRootSearch({items:[],complete:true},'SYNTHETIC');get('thought-search').value='';controller.searchRoot();clearTimeout(controller.searchTimer);
  let releaseClear;controller.homeCollection.hydrateWindow=()=>new Promise(resolve=>releaseClear=resolve);const clearing=controller.renderHomeReader(controller.rootInvalidationAnchor);globalThis.scrollY+=30;const userScroll=globalThis.scrollY;controller.topicRestoring=()=>false;controller.topicRestoreInput({type:'wheel',isTrusted:true});controller.cancelHomeAnchor();releaseClear(true);await clearing;while(frames.length)frames.shift()();assert.equal(globalThis.scrollY,userScroll,'late clear hydration cannot override a subsequent user scroll');globalThis.scrollY-=30;
  const geometry=dom.owner.captureReturnGeometry();
  for(const mismatch of ['authority','source','session','width','columns','revision','preference']){
   dom.owner.clear();dom.owner.render(items,{complete:true,returnGeometry:geometry});controller.homeCollection=collection;controller.homePage={page:{items}};get('thought-search').value='SYNTHETIC';controller.searchRoot();clearTimeout(controller.searchTimer);controller.paintRootSearch({items:[],complete:true},'SYNTHETIC');
   if(mismatch==='authority')controller.rootPreSearch.returnGeometry.authority='different';
   if(mismatch==='source')controller.rootProviderKey='different';
   if(mismatch==='session')controller.rootGeometrySession=(controller.rootGeometrySession||0)+1;
   if(mismatch==='width')dom.host.clientWidth--;
   if(mismatch==='columns')columns=3;
   if(mismatch==='revision')controller.rootPreSearch.items=items.map(item=>item.id==='a'?{...item,revision:2}:item);
   if(mismatch==='preference'){document.documentElement.lang='zh-CN';previews.preferences();}
   get('thought-search').value='';controller.searchRoot();clearTimeout(controller.searchTimer);assert.equal(dom.owner.nodes.get('a').querySelector('.personal-topic-preview').style.minHeight||'','',mismatch+' cannot revive a search-exit shell');assert.equal(controller.rootPreSearch,null);
   controller.rootProviderKey=null;dom.host.clientWidth=1000;columns=2;document.documentElement.lang='en';
  }

  for(const mismatch of ['revision','count','width','columns','presentation','epoch','cap']){
   dom.owner.clear();let rows=items,saved=structuredClone(geometry);if(mismatch==='revision')rows=items.map(x=>x.id==='a'?{...x,revision:2}:x);if(mismatch==='count')rows=items.slice(1);if(mismatch==='width')saved.width--;if(mismatch==='columns')saved.columns=3;if(mismatch==='presentation')saved.presentation='different';if(mismatch==='epoch')saved.epoch=(previews.geometryEpoch||0)+1;if(mismatch==='cap')saved.rows=Array(50001).fill(saved.rows[0]);dom.owner.render(rows,{complete:true,returnGeometry:saved});assert.ok(!dom.owner.nodes.get('a')?.querySelector('.personal-topic-preview').style.minHeight,mismatch+' cannot revive a shell');
  }
  for(const mismatch of ['source','session','intent','input','authority','scroll','pending-input']){
   dom.owner.clear();controller.rootReturnGeometry={geometry,source:null,session:controller.rootGeometrySession||0,intent:controller.openIntent,inputEpoch:controller.homeAnchorInputEpoch||0,authority:collection.authority,scroll:globalThis.scrollY||0};
   if(mismatch==='source')controller.rootReturnGeometry.source='other';if(mismatch==='session')controller.rootReturnGeometry.session++;if(mismatch==='intent')controller.rootReturnGeometry.intent++;if(mismatch==='input')controller.rootReturnGeometry.inputEpoch++;if(mismatch==='authority')controller.rootReturnGeometry.authority='other';if(mismatch==='scroll')controller.rootReturnGeometry.scroll+=30;
   if(mismatch==='pending-input'){controller.paintHome({items:[],indexing:true},'');assert.ok(controller.rootReturnGeometry,'only bounded indexing retains pending numbers');controller.cancelHomeAnchor();assert.equal(controller.rootReturnGeometry,null);}
   controller.paintHome({items,complete:true},'');assert.equal(dom.owner.nodes.get('a').querySelector('.personal-topic-preview').style.minHeight||'','',mismatch+' retires the return');
  }
  dom.owner.clear();document.documentElement.lang='zh-CN';previews.preferences();document.documentElement.lang='en';previews.preferences();dom.owner.render(items,{complete:true,returnGeometry:geometry});assert.equal(dom.owner.nodes.get('a').querySelector('.personal-topic-preview').style.minHeight||'','','a presentation change and back cannot resurrect the former snapshot');
  dom.owner.clear();let masked=false;document.documentElement.classList={contains:()=>masked};const beforeMask={...geometry,epoch:previews.geometryEpoch};masked=true;previews.preferences();masked=false;previews.preferences();dom.owner.render(items,{complete:true,returnGeometry:beforeMask});assert.equal(dom.owner.nodes.get('a').querySelector('.personal-topic-preview').style.minHeight||'','','mask and unmask retire old geometry even after presentation matches again');
  // A newly missing current qualification clears even a previously measured
  // visible shell. The snapshot never acts as permission to read or show text.
  dom.owner.clear();globalThis.scrollY=0;const current={...geometry,epoch:previews.geometryEpoch};dom.owner.render(items,{complete:true,returnGeometry:current});assert.equal(dom.owner.nodes.get('a').querySelector('.personal-topic-preview').style.minHeight,'61px');pending.at(-1)({kind:'root_previews',items:[]});await new Promise(resolve=>setImmediate(resolve));assert.equal(dom.owner.nodes.get('a').querySelector('.personal-topic-preview').style.minHeight,'');assert.equal(dom.owner.nodes.get('a').querySelector('.personal-topic-preview').textContent,'');
  dom.owner.items=Array(50001).fill(items[0]);assert.equal(dom.owner.captureReturnGeometry(),null,'capture cannot exceed the existing identity envelope');
  document.querySelectorAll=()=>[];get('library-unplaced-list').hidden=true;controller.thoughtRootVisible=()=>true;controller.homeCollection={...collection,reset(){}};controller.homePositions.set('home',{returnGeometry:{geometry}});controller.rootReturnGeometry={geometry};controller.invalidateHomeSnapshot({cause:'REMOVE_LIBRARY_TOPIC'});assert.equal(controller.rootReturnGeometry,null);assert.equal(controller.homePositions.get('home').returnGeometry,undefined);assert.equal(dom.owner.nodes.size,0,'actual removal invalidation retains no nodes or shells');
  controller.homePositions.set('home',{returnGeometry:{geometry}});controller.rootReturnGeometry={geometry};controller.statusEpoch=0;controller.refresh=async()=>{};await controller.changeRootSourceScope('claude');assert.equal(controller.rootReturnGeometry,null);assert.equal(controller.homePositions.get('home').returnGeometry,undefined,'actual source change retires parked geometry');
  controller.homePositions.set('home',{returnGeometry:{geometry}});controller.rootReturnGeometry={geometry};controller.beginRootEntry();assert.equal(controller.rootReturnGeometry,null);assert.equal(controller.homePositions.has('home'),false,'ordinary Home cannot reuse a previous reading-chain shell');

 }finally{previews?.dispose();Object.assign(globalThis,prior);}
});
