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
 const create=tag=>{const node=dom.create(tag);node.style=style();node.getBoundingClientRect=()=>({height:120});node.replaceWith=next=>{node.parentElement.insertBefore(next,node);node.remove();};return node;};
 const query={value:'NEEDLE'},status={},empty={},errors=[];
 globalThis.document={documentElement:{lang:'en'},body:dom.host,hidden:false,createElement:create,createElementNS:(ns,tag)=>create(tag),createTextNode:presentationText,addEventListener(){},removeEventListener(){},getElementById:id=>({'thought-search':query,'library-search-status':status,'thought-empty':empty}[id])};
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
  controller.homeCollection={query:'NEEDLE',releaseBodies(){}};query.value='NEW';controller.searchRoot();clearTimeout(controller.searchTimer);assert.equal(dom.tile.style.height,'443px');assert.equal(body.textContent,'');
  collection.stale=true;const invalidated=controller.loadRootSearchBase();await invalidated;assert.deepEqual(errors,[['主题目录已变化，请重试读取。','read_error']]);assert.equal(dom.owner.nodes.size,0,'stale metadata clears the real root');assert.equal(dom.owner.searchGeometry,null);assert.equal(body.textContent,'');
 }finally{clearTimeout(controller?.searchTimer);previews?.dispose();Object.assign(globalThis,prior);}
});
