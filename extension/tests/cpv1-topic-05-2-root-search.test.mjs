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
test('TOPIC-05.2 actual directory hydration failure or stale authority never publishes an empty complete extent',async()=>{
 for(const mode of ['stale','error']){let rendered=0,cleared=0,refreshed=0;const anchor={key:'item:still-reserved',id:'still-reserved',top:181},collection={windowRevision:1,hydrateWindow:async()=>false,state:()=>({error:mode==='error'?Error('SYNTHETIC replay failure'):null}),stale:mode==='stale'},owner=Object.assign(Object.create(TopicController.prototype),{id:null,serial:1,openIntent:1,homeCollection:collection,paintHome:()=>rendered++,clearHomeRows:()=>cleared++,refresh:()=>refreshed++,updateHomeContinuous:()=>{}});
  assert.equal(await owner.renderHomeReader(anchor),false);assert.equal(rendered,0);assert.equal(cleared,mode==='stale'?1:0);assert.equal(refreshed,mode==='stale'?1:0);assert.deepEqual(mode==='stale'?owner.rootInvalidationAnchor:owner.homeHydrationAnchor,anchor);
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

test('TOPIC-05.2 original body-free reading anchor requires current scope and authority after query UI retirement',()=>{
 const saved={key:'item:deep-topic',id:'deep-topic',top:181},current={key:'item:first-topic',id:'first-topic',top:164};
 for(const mismatch of ['none','authority','scope','identity']){const collection={query:'',scope:'root',authority:'current-authority',keys:new Set([saved.key,current.key])},owner=Object.assign(Object.create(TopicController.prototype),{homeCollection:collection,homeReadingPosition:{scope:mismatch==='scope'?'other':'root',authority:mismatch==='authority'?'old':'current-authority',anchor:saved}});if(mismatch==='identity')collection.keys.delete(saved.key);
  assert.deepEqual(owner.previousHomeAnchor(),mismatch==='none'?saved:null);owner.rememberHomeAnchor(current);assert.deepEqual(owner.previousHomeAnchor(),current);assert.doesNotMatch(JSON.stringify(owner.homeReadingPosition),/snippet|body|textContent|NEEDLE/);
 }
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


test('TOPIC-05.3 retired Root query has no focus target while truthful directory coverage status stays outside continuation',async()=>{
 const html=await readFile(new URL('../ui/archive.html',import.meta.url),'utf8'),root=html.slice(html.indexOf('<div id="thought-collection"'),html.indexOf('<article id="thought-document"'));
 assert.equal((html.match(/id="library-search-status"/g)||[]).length,1);assert.doesNotMatch(html,/<input[^>]*id="thought-search"/);
 assert.match(root,/<div id="thought-list"><\/div><p id="library-search-status" role="status"><\/p>/);assert.ok(root.indexOf('id="thought-list"')<root.indexOf('id="library-search-status"'));assert.ok(root.indexOf('id="library-search-status"')<root.indexOf('id="thought-continuous-sentinel"'));
 const source=await readFile(new URL('../ui/topic-workspace.js',import.meta.url),'utf8');assert.match(source,/page\.coverage\?\.complete===false\?'继续向下读取全部主题。'/);assert.match(source,/GET_LIBRARY_ROOT_SEARCH/,'shared external lexical service remains available');
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
  natural=180;dom.owner.render([{...item,name:'SYNTHETIC renamed'}]);assert.equal(replacement.style.height,undefined,'normal content-sized render removes the transient height');assert.equal(dom.owner.searchGeometry,null);assert.equal(updates,0,'ordinary approved metadata-only Root never starts preview reads');assert.equal(dom.owner.flowHeights.get('topic'),180,'normal flow grows to current content without permanent holes');
  dom.owner.search(hits,'again',{open(){}});dom.owner.clear();assert.equal(dom.owner.searchGeometry,null);assert.equal(dom.owner.nodes.size,0);assert.equal(dom.host.textContent,'');
 }finally{Object.assign(globalThis,prior);}
});

test('Root direct search snapshots every card before synchronous preview removal can shrink it',()=>{
 const prior=globalThis.document,dom=searchDOM('topic');let privateBody=true;
 globalThis.document={documentElement:{lang:'en'},body:dom.host,createElement:dom.create,createTextNode:presentationText};
 dom.tile.getBoundingClientRect=()=>({height:privateBody?443:366});dom.owner.previews={clear(){privateBody=false;}};
 try{dom.owner.search([],'NEEDLE',{open(){}});assert.equal(privateBody,false);assert.equal(dom.tile.style.height,'443px');assert.equal(dom.owner.searchGeometry.rows.get('topic').height,443);}finally{globalThis.document=prior;}
});

test('real Root controller retains qualified metadata during held hydration and rejects later source intent without preview reads',async()=>{
 const f=metadataRoot();try{const {controller:c,root,items}=f;let release,paints=0;const collection=c.homeCollection;collection.hydrateWindow=()=>new Promise(r=>release=r);c.paintHome=()=>paints++;const read=c.renderHomeReader({key:'item:a',id:'a',top:180});assert.equal(root.nodes.size,10);assert.equal(root.host.querySelectorAll('.personal-topic-preview').length,0);assert.equal(root.captureReturnGeometry(),null);c.homeCollection={...collection};release(true);assert.equal(await read,false);assert.equal(paints,0,'old source cannot repaint identical current metadata');assert.equal(root.nodes.size,10);
  c.homeCollection=collection;collection.hydrateWindow=async()=>true;c.paintHome=TopicController.prototype.paintHome;c.homePageState=()=>({items,complete:true});c.updateHomeContinuous=()=>{};c.readKey=()=> 'root';c.restoreHomeAnchor=()=>assert.fail('obsolete intent must not restore an anchor');
  for(const fence of ['intent','input']){let settle;collection.hydrateWindow=()=>new Promise(r=>settle=r);const reading=c.renderHomeReader({key:'item:a',top:180});if(fence==='intent')c.openIntent++;else c.topicRestoreInputEpoch=(c.topicRestoreInputEpoch||0)+1;settle(true);assert.equal(await reading,true);assert.equal(root.host.querySelectorAll('.personal-topic-preview').length,0);assert.equal(root.nodes.size,items.length);}
  assert.equal(root.captureReturnGeometry(),null,'retired preview shell is never persisted');
 }finally{f.close();}
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


function metadataRoot({columns=2}={}){
 const keys=['document','location','getSelection','getComputedStyle','innerWidth','innerHeight','requestAnimationFrame','scrollBy','scrollY','ResizeObserver'],prior=Object.fromEntries(keys.map(key=>[key,globalThis[key]])),dom=searchDOM('a'),frames=[],controls=new Map();let resized,controller;
 const create=tag=>{const n=dom.create(tag);n.style={removeProperty(key){delete this[key];}};n.replaceWith=other=>{n.parentElement?.insertBefore(other,n);n.remove();};n.closest=()=>n.classList.contains('personal-topic-block')?n:n.parentElement?.closest?.('.personal-topic-block');n.getBoundingClientRect=()=>{const height=n.classList.contains('personal-topic-block')?(n.dataset.topicId==='a'?155:94):0,top=200+(parseInt(n.style.gridRow)||1)-1-globalThis.scrollY;return {top,bottom:top+height,height,width:300,left:0,right:300};};return n;};
 const get=id=>{if(id==='thought-list')return dom.host;if(!controls.has(id)){const n=create('div');n.value='';controls.set(id,n);}return controls.get(id);};
 globalThis.document={body:dom.host,documentElement:{lang:'en'},hidden:false,getElementById:get,querySelectorAll:()=>[],createElement:create,createElementNS:(_,tag)=>create(tag),createTextNode:presentationText,addEventListener(){},removeEventListener(){}};
 Object.assign(globalThis,{location:{href:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/ui/archive.html'},getSelection:()=>({isCollapsed:true}),getComputedStyle:()=>({getPropertyValue:()=>String(columns)}),innerWidth:1000,innerHeight:720,scrollY:0,requestAnimationFrame:fn=>frames.push(fn),scrollBy:(_,value)=>globalThis.scrollY+=value,ResizeObserver:class{constructor(fn){resized=fn;}observe(){}unobserve(){}disconnect(){}}});
 dom.host.replaceChildren();dom.host.style={};dom.host.clientWidth=1000;dom.host.getClientRects=()=>[{}];const root=new PersonalTopicRoot(dom.host,{open(){},onResize:()=>controller?.resizeHomeAnchor()});
 const items=[...'abcdefghij'].map(id=>({id,name:'SYNTHETIC LABEL '+id,revision:1,organizationRevision:1,layoutGeneration:1,sectionOverview:{items:[],complete:true}}));root.render(items,{complete:true});const collection={authority:'A',scope:'root',query:'',state:()=>({}),keys:new Set(items.map(item=>'item:'+item.id)),snapshot:()=>({items:items.map(({id})=>({id,key:'item:'+id}))}),reset(){},releaseBodies(){}};
 controller=Object.assign(Object.create(TopicController.prototype),{personalRoot:root,homeCollection:collection,homePositions:new Map(),id:null,serial:1,openIntent:1,view:'original',rememberTimeline(){},rememberView(){},leaveEditors:async()=>true,onStatus(){},refresh:async()=>{},thoughtRootVisible:()=>true});
 return {root,controller,items,collection,get,frames,resize:()=>resized([{target:root.nodes.get('a')}]),columns:value=>columns=value,drain(){while(frames.length)frames.shift()();},close(){root.resize?.disconnect();Object.assign(globalThis,prior);}};
}

test('actual Root capture clear repaint and Back restore the activated identity across independent column geometry',async()=>{
 const f=metadataRoot();try{const {controller:c,root,items}=f;root.nodes.get('j').querySelector('.personal-topic-link').focus();globalThis.scrollY=330;const anchor=c.captureHomeAnchor(),node=root.nodes.get('j');assert.equal(anchor.id,'j');c.clearHomeRows();assert.equal(root.nodes.size,0);assert.equal(root.host.textContent,'');assert.equal(node.isConnected,false);root.render(items,{complete:true});globalThis.scrollY=0;c.restoreHomeAnchor(anchor);f.drain();assert.equal(root.nodes.get('j').getBoundingClientRect().top,anchor.top);assert.equal(document.activeElement.dataset.topicId,'j');assert.equal(root.host.querySelectorAll('.personal-topic-preview').length,0);
  for(const cause of ['REMOVE_LIBRARY_TOPIC','RESTORE_LIBRARY_TOPIC']){const top=root.nodes.get('j').getBoundingClientRect().top;c.invalidateHomeSnapshot({cause});assert.equal(root.nodes.size,0);assert.equal(c.rootInvalidationAnchor.id,'j');root.render(cause==='REMOVE_LIBRARY_TOPIC'?items.slice(1):items,{complete:true});c.homeCollection={...f.collection};c.restoreHomeAnchor(c.rootInvalidationAnchor);f.drain();assert.equal(root.nodes.get('j').getBoundingClientRect().top,top);assert.equal(document.activeElement.dataset.topicId,'j');}
  document.activeElement=f.get('neutral');globalThis.scrollY=0;assert.equal(c.captureHomeAnchor().id,'a');assert.doesNotMatch(JSON.stringify(anchor),/SYNTHETIC LABEL|preview|body|textContent/);
 }finally{f.close();}
});

test('held metadata resize after Back RAFs preserves identity without overriding later reader intent',async()=>{
 const f=metadataRoot({columns:1});try{const {controller:c,root}=f;root.nodes.get('b').querySelector('.personal-topic-link').focus();const anchor=c.captureHomeAnchor();c.restoreHomeAnchor(anchor);f.drain();root.nodes.get('a').getBoundingClientRect=()=>({height:232,top:200-globalThis.scrollY,bottom:432-globalThis.scrollY});f.resize();f.drain();assert.equal(root.nodes.get('b').getBoundingClientRect().top,anchor.top);assert.equal(document.activeElement.dataset.topicId,'b');assert.equal(root.host.querySelectorAll('.personal-topic-preview').length,0);
  for(const fence of ['scroll','input','route','collection','serial','width']){c.id=null;c.serial=1;root.host.clientWidth=1000;c.homeCollection={...f.collection};c.restoreHomeAnchor(c.captureHomeAnchor());f.drain();if(fence==='scroll')globalThis.scrollY+=30;if(fence==='input')c.cancelHomeFocusScroll();if(fence==='route')c.id='reader';if(fence==='collection')c.homeCollection={};if(fence==='serial')c.serial++;if(fence==='width')root.host.clientWidth=900;const before=globalThis.scrollY;root.layout();c.resizeHomeAnchor();f.drain();assert.equal(globalThis.scrollY,before,fence+' invalidates delayed correction');}
 }finally{f.close();}
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

test('ordinary Back restores both independent-column anchors using only body-free current metadata geometry',async()=>{
 const f=metadataRoot();try{const {controller:c,root,items}=f;globalThis.scrollY=330;root.nodes.get('j').querySelector('.personal-topic-link').focus();const first=()=>[...root.nodes.values()].find(node=>{const r=node.getBoundingClientRect();return r.bottom>120&&r.top<innerHeight;}),before={first:first().dataset.topicId,top:first().getBoundingClientRect().top,activated:root.nodes.get('j').getBoundingClientRect().top};assert.notEqual(before.first,'j','independent-column first-visible and activated anchors are distinct');
  for(let visit=0;visit<3;visit++){assert.equal(await c.leave(),true);assert.equal(root.nodes.size,0);assert.equal(root.host.textContent,'');const saved=c.homePositions.get('home');assert.doesNotMatch(JSON.stringify(saved),/SYNTHETIC LABEL|PRIVATE BODY|textContent|childNodes|snippet/);assert.equal(saved.returnGeometry.geometry,null,'retired preview geometry never supplies a body cache');c.paintHome({items,complete:true},'');c.restoreHomeAnchor(saved.rootAnchor);f.drain();assert.equal(first().dataset.topicId,before.first);assert.equal(first().getBoundingClientRect().top,before.top);assert.equal(root.nodes.get('j').getBoundingClientRect().top,before.activated);assert.equal(document.activeElement.dataset.topicId,'j');assert.equal(root.host.querySelectorAll('.personal-topic-preview').length,0);}
  Object.assign(f.collection,{windowRevision:1,hydrateWindow:()=>new Promise(resolve=>release=resolve),state:()=>({})});let release;c.homeCollection=f.collection;c.homePageState=()=>({items,complete:true});c.updateHomeContinuous=()=>{};c.readKey=()=> 'root';const anchor=c.captureHomeAnchor(),reading=c.renderHomeReader(anchor);globalThis.scrollY+=30;const userScroll=scrollY;c.topicRestoreInputEpoch=(c.topicRestoreInputEpoch||0)+1;c.cancelHomeAnchor();release(true);await reading;f.drain();assert.equal(scrollY,userScroll,'later input wins over held directory hydration');
  const geometry={rows:[{id:'a',height:61}],width:1000,columns:2,presentation:'old-private-preview',epoch:1};for(const mismatch of ['revision','count','width','columns','presentation','epoch','cap']){root.clear();const stale=structuredClone(geometry);if(mismatch==='width')stale.width--;if(mismatch==='columns')stale.columns=3;if(mismatch==='presentation')stale.presentation='different';if(mismatch==='epoch')stale.epoch++;if(mismatch==='cap')stale.rows=Array(50001).fill(stale.rows[0]);root.render(mismatch==='count'?items.slice(1):mismatch==='revision'?items.map(item=>({...item,revision:2})):items,{complete:true,returnGeometry:stale});assert.equal(root.captureReturnGeometry(),null,mismatch);assert.equal(root.host.querySelectorAll('.personal-topic-preview').length,0,mismatch);assert.ok([...root.nodes.values()].every(node=>!node.style.height),mismatch+' cannot revive a former fixed shell');}
  const render=root.render.bind(root);let admittedGeometry;root.render=(values,options)=>{admittedGeometry=options.returnGeometry;return render(values,options);};for(const mismatch of ['source','session','intent','input','authority','scroll','pending-input']){c.homeCollection=f.collection;root.clear();c.rootReturnGeometry={geometry,source:c.rootProviderKey||null,session:c.rootGeometrySession||0,intent:c.openIntent,inputEpoch:c.homeAnchorInputEpoch||0,authority:f.collection.authority,scroll:globalThis.scrollY||0};if(mismatch==='source')c.rootReturnGeometry.source='other';if(mismatch==='session')c.rootReturnGeometry.session++;if(mismatch==='intent')c.rootReturnGeometry.intent++;if(mismatch==='input')c.rootReturnGeometry.inputEpoch++;if(mismatch==='authority')c.rootReturnGeometry.authority='other';if(mismatch==='scroll')c.rootReturnGeometry.scroll+=30;if(mismatch==='pending-input'){assert.equal(c.paintHome({items:[],indexing:true},''),false);assert.ok(c.rootReturnGeometry);c.cancelHomeAnchor();}c.paintHome({items,complete:true},'');assert.equal(admittedGeometry,null,mismatch+' retires the old return envelope');assert.equal(c.rootReturnGeometry,null);assert.equal(root.host.querySelectorAll('.personal-topic-preview').length,0);}
  root.items=Array(50001).fill(items[0]);assert.equal(root.captureReturnGeometry(),null,'oversized identities cannot create a retired shell');root.items=items;c.homeCollection=f.collection;c.homePositions.set('home',{returnGeometry:{geometry}});c.rootReturnGeometry={geometry};f.get('library-unplaced-list').hidden=true;c.invalidateHomeSnapshot({cause:'REMOVE_LIBRARY_TOPIC'});assert.equal(c.rootReturnGeometry,null);assert.equal(c.homePositions.get('home').returnGeometry,undefined);assert.equal(root.nodes.size,0);c.homePositions.set('home',{returnGeometry:{geometry}});c.rootReturnGeometry={geometry};c.statusEpoch=0;c.refresh=async()=>{};await c.changeRootSourceScope('claude');assert.equal(c.rootReturnGeometry,null);assert.equal(c.homePositions.get('home').returnGeometry,undefined);c.homePositions.set('home',{returnGeometry:{geometry}});c.beginRootEntry();assert.equal(c.homePositions.has('home'),false);
 }finally{f.close();}
});
