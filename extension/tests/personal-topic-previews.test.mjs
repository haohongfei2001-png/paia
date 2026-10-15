import test from 'node:test';
import assert from 'node:assert/strict';
import {PersonalTopicPreviews} from '../ui/personal-topic-previews.js';
import {PresentationNode as Node} from './harness/presentation-dom.mjs';
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(t){
 const prior={};for(const key of ['document','innerHeight','innerWidth'])prior[key]=Object.getOwnPropertyDescriptor(globalThis,key);
 const doc={body:new Node(),hidden:false,documentElement:{lang:'en'},createElement:tag=>new Node(tag),addEventListener(){},removeEventListener(){}};
 Object.assign(globalThis,{document:doc,innerHeight:800,innerWidth:1000});t.after(()=>{owner.dispose();for(const [key,value]of Object.entries(prior))if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];});
 const host=new Node(),nodes=new Map(),items=[],pending=[],opens=[];doc.body.append(host);
 for(let i=0;i<30;i++){const node=new Node(),p=new Node(),link=new Node('a');p.style={};p.getBoundingClientRect=()=>({height:p.childNodes.length?40:0});Object.defineProperty(p,'childElementCount',{get:()=>p.children.length});node.rect={width:250,height:100,top:i<15?10:1000,bottom:i<15?110:1100,left:0,right:250};node.getBoundingClientRect=()=>node.rect;node.querySelector=s=>s==='.personal-topic-preview'?p:link;node.append(link,p);host.append(node);nodes.set(String(i),node);items.push({id:String(i),revision:0,organizationRevision:0,layoutGeneration:1});}
 const owner=new PersonalTopicPreviews(host,{nodes:()=>nodes,open:(...args)=>opens.push(args),send:(_,args)=>new Promise(resolve=>pending.push({args,resolve}))});
 const respond=(index=0)=>pending[index].resolve({kind:'root_previews',items:pending[index].args.options.topics.map(item=>({topicId:item.id,preview:{text:'SYNTHETIC original',entryId:'entry',sectionId:'section'}}))});
 return {owner,host,nodes,items,pending,respond,opens,doc};
}
test('visible preview owner caps twelve text nodes and has no body in metadata',async t=>{const f=fixture(t);f.owner.update(f.items);assert.equal(f.pending[0].args.options.topics.length,12);f.respond();await settle();assert.equal(f.host.dataset.retainedPreviewBodies,'12');assert.equal(f.host.dataset.retainedPreviewChars,String(12*18));assert.equal(f.host.dataset.previewState,'settled');assert.equal(JSON.stringify(f.owner.items).includes('original'),false);});
test('clear retires a delayed response and removes all text and measured space',async t=>{const f=fixture(t);f.owner.update(f.items);f.owner.clear();f.respond();await settle();assert.equal(f.host.dataset.retainedPreviewBodies,'0');assert.equal(f.host.dataset.previewState,'off');assert.ok([...f.nodes.values()].every(n=>n.querySelector('.personal-topic-preview').hidden));});
test('offscreen body is released while only measured geometry remains',async t=>{const f=fixture(t);f.owner.update(f.items);f.respond();await settle();f.nodes.get('0').rect.top=1000;void f.owner.refresh();assert.equal(f.nodes.get('0').querySelector('.personal-topic-preview').textContent,'');assert.equal(f.nodes.get('0').querySelector('.personal-topic-preview').style.minHeight,'40px');f.respond(1);await settle();assert.equal(f.host.dataset.retainedPreviewBodies,'12');});
test('unchanged visible identity keeps the selected button and explicit Section target',async t=>{const f=fixture(t);f.owner.update(f.items);f.respond();await settle();const b=f.nodes.get('0').querySelector('.personal-topic-preview').firstElementChild;b.focus();f.owner.update(f.items);assert.equal(f.pending.length,1);assert.equal(f.doc.activeElement,b);b.listeners.get('click')({detail:0});assert.deepEqual(f.opens,[['0','section']]);assert.equal(b.getAttribute('title'),null);assert.equal(b.dataset.rootPreview,'true');});
test('privacy invalidation clears actual bodies immediately',async t=>{const f=fixture(t);f.owner.update(f.items);f.respond();await settle();f.owner.changed({type:'ARCHIVE_CHANGED'});assert.equal(f.host.dataset.retainedPreviewBodies,'0');assert.ok(!f.host.textContent.includes('original'));});
test('masked and missing fresh results revoke previously eligible same-revision previews',async t=>{for(const result of [{kind:'root_previews',masked:true,items:[]},{kind:'root_previews',items:[]}]){const f=fixture(t);f.owner.update(f.items);f.respond();await settle();f.nodes.get('0').rect.top=1000;void f.owner.refresh();f.pending[1].resolve(result);await settle();assert.equal(f.host.dataset.retainedPreviewBodies,'0');f.owner.dispose();}});
test('newer visible request retires older callbacks and detached targets',async t=>{const f=fixture(t);f.owner.update(f.items);f.nodes.get('0').rect.top=1000;void f.owner.refresh();f.respond(1);await settle();f.respond(0);await settle();assert.equal(f.nodes.get('0').querySelector('.personal-topic-preview').textContent,'');const b=f.nodes.get('1').querySelector('.personal-topic-preview').firstElementChild;f.owner.clear();b.listeners.get('click')({detail:0});assert.deepEqual(f.opens,[]);});
test('hidden tab releases bodies and visible tab requalifies retained metadata',async t=>{const f=fixture(t);f.owner.update(f.items);f.respond();await settle();f.doc.hidden=true;f.owner.visibility();assert.equal(f.host.dataset.retainedPreviewBodies,'0');assert.equal(f.owner.items.length,30);f.doc.hidden=false;f.owner.visibility();assert.equal(f.pending.length,2);f.respond(1);await settle();assert.equal(f.host.dataset.retainedPreviewBodies,'12');});
test('real preference application immediately revokes DOM bodies and rechecks server policy',async t=>{const f=fixture(t);f.owner.update(f.items);f.respond();await settle();f.owner.preferences();assert.equal(f.host.dataset.retainedPreviewBodies,'0');f.pending[1].resolve({kind:'root_previews',masked:true,items:[]});await settle();assert.equal(f.host.dataset.retainedPreviewBodies,'0');});
test('response rechecks viewport after a non-scroll layout shift',async t=>{const f=fixture(t);f.owner.update(f.items);for(const node of f.nodes.values())node.rect.top=2000;f.respond();await settle();assert.equal(f.host.dataset.retainedPreviewBodies,'0');});
test('same metadata with a newly rendered card requalifies and fills the new node',async t=>{const f=fixture(t);f.owner.update(f.items);f.respond();await settle();const old=f.nodes.get('0'),replacement=new Node(),p=new Node();p.style={};p.getBoundingClientRect=()=>({height:40});Object.defineProperty(p,'childElementCount',{get:()=>p.children.length});replacement.getBoundingClientRect=()=>old.rect;replacement.querySelector=()=>p;replacement.append(p);old.remove();f.host.append(replacement);f.nodes.set('0',replacement);f.owner.update(f.items);assert.equal(f.pending.length,2);f.respond(1);await settle();assert.equal(p.textContent,'SYNTHETIC original');assert.equal(f.host.dataset.retainedPreviewBodies,'12');});
test('actual successful TopicController leave synchronously clears real Root and preview owners',async t=>{const f=fixture(t),{TopicController}=await import('../ui/topic-workspace.js'),{PersonalTopicRoot}=await import('../ui/personal-topic-root.js');f.owner.update(f.items);f.respond();await settle();const retained=[...f.nodes.values()],root=Object.assign(Object.create(PersonalTopicRoot.prototype),{host:f.host,nodes:f.nodes,previews:f.owner,items:f.items}),controller=Object.assign(Object.create(TopicController.prototype),{id:null,view:'original',personalRoot:root,homePage:{},homePositions:new Map(),captureHomePosition:()=>({scroll:0}),rememberTimeline(){},rememberView(){},leaveEditors:async()=>true});assert.equal(await controller.leave(),true);assert.equal(f.host.dataset.retainedPreviewBodies,'0');assert.equal(f.nodes.size,0);assert.equal(f.owner.items.length,0);assert.equal(f.host.children.length,0);assert.ok(retained.every(node=>node.querySelector('.personal-topic-preview').textContent===''));assert.equal(controller.homePage,null);});
test('actual Root render releases removed nodes retained by an in-flight preview request',async t=>{const f=fixture(t),{PersonalTopicRoot}=await import('../ui/personal-topic-root.js');f.owner.update(f.items);f.respond();await settle();f.nodes.get('0').rect.top=2000;void f.owner.refresh();assert.equal(f.pending.length,2);const retained=[...f.nodes.values()],root=Object.assign(Object.create(PersonalTopicRoot.prototype),{host:f.host,nodes:f.nodes,previews:f.owner,items:f.items,rememberRows(){},layout(){}});root.render([],{complete:true});assert.equal(f.nodes.size,0);assert.ok(retained.every(node=>node.querySelector('.personal-topic-preview').textContent===''));assert.equal(f.host.dataset.retainedPreviewBodies,'0');f.respond(1);await settle();assert.ok(retained.every(node=>node.querySelector('.personal-topic-preview').textContent===''));});

 test('writing suspension retires ordinary bodies before freezing Root and rejects held replies',async t=>{
 const f=fixture(t);f.owner.update(f.items);f.respond();await settle();f.owner.preferences();assert.equal(f.pending.length,2);
 f.owner.suspend();assert.equal(f.host.dataset.retainedPreviewBodies,'0');assert.equal(f.owner.items.length,30);
 let mutations=0;for(const node of f.nodes.values()){const p=node.querySelector('.personal-topic-preview'),replace=p.replaceChildren.bind(p);p.replaceChildren=(...args)=>{mutations++;return replace(...args);};}
 f.respond(1);await settle();f.owner.changed({type:'ARCHIVE_CHANGED'});f.owner.preferences();f.doc.hidden=true;f.owner.visibility();f.doc.hidden=false;f.owner.visibility();void f.owner.refresh();await settle();
 assert.equal(mutations,0,'held read and publication cannot mutate the frozen Root');assert.equal(f.pending.length,2);assert.equal(f.host.dataset.retainedPreviewBodies,'0');
 f.owner.resume();assert.equal(f.pending.length,3);f.respond(2);await settle();assert.equal(f.host.dataset.retainedPreviewBodies,'12','return requalifies current visible originals');
 });
 test('writing suspension retains only metadata and route clear prevents return resurrection',async t=>{
 const f=fixture(t);f.owner.update(f.items);f.owner.suspend();f.owner.clear();f.respond();await settle();f.owner.resume();await settle();assert.equal(f.pending.length,1);assert.equal(f.owner.items.length,0);assert.equal(f.host.dataset.retainedPreviewBodies,'0');
 });

test('actual archive writing transition suspends Root previews before render and resumes on close',async t=>{
 const f=fixture(t);f.owner.update(f.items);f.respond();await settle();
 const {readFile}=await import('node:fs/promises'),source=await readFile(new URL('../ui/archive.js',import.meta.url),'utf8');
 const body=source.slice(source.indexOf('topicActions.onWorkspaceChange=()=>{'),source.indexOf('topicActions.onDeferredRead='));
 const actions={surface:{workspace:true},openIntent:1},thoughts={id:null,openIntent:1,personalRoot:{previews:f.owner},captureHomeAnchor:()=>null};let renders=0;
 new Function('topicActions','thoughts','routes','render','refresh','scrollTo','scrollY',"const view='thoughts',documentId=null,navigationIntent=1;let writingReturn=null,writingRefreshPending=false;"+body)(actions,thoughts,{checkpoint(){}},()=>{renders++;if(actions.surface)assert.equal(f.host.dataset.retainedPreviewBodies,'0','synchronous privacy release precedes hiding the Root');},()=>Promise.resolve(),()=>{},0);
 actions.onWorkspaceChange();assert.equal(f.owner.suspended,true);assert.equal(renders,1);actions.surface=null;actions.onWorkspaceChange();assert.equal(f.owner.suspended,false);assert.equal(f.pending.length,2);f.respond(1);await settle();assert.equal(f.host.dataset.retainedPreviewBodies,'12');
});

test('metadata-only invalidation retains measured offscreen geometry while revoking all text',async t=>{
 const f=fixture(t);f.owner.update(f.items);f.respond();await settle();const node=f.nodes.get('0'),p=node.querySelector('.personal-topic-preview');
 p.getBoundingClientRect=()=>({height:p.childElementCount?40:Number.parseFloat(p.style.minHeight)||0});
 node.rect.top=1000;void f.owner.refresh();assert.equal(p.textContent,'');assert.equal(p.style.minHeight,'40px');
 f.owner.changed({type:'ARCHIVE_CHANGED',cause:'EDIT_LIBRARY_TOPIC'});assert.equal(p.textContent,'');assert.equal(p.style.minHeight,'40px','rename cannot collapse another offscreen card');
 f.owner.clear();assert.equal(p.style.minHeight,'','route/privacy clear still retires every measured reservation');
});

test('held qualified preview response cannot collapse a card that scrolled out after the request',async t=>{
 const f=fixture(t);f.owner.update(f.items);f.respond();await settle();const node=f.nodes.get('0'),p=node.querySelector('.personal-topic-preview');
 p.getBoundingClientRect=()=>({height:p.childElementCount?40:Number.parseFloat(p.style.minHeight)||0});
 f.items[0].revision=1;f.owner.update(f.items);const held=f.pending.length-1;node.rect.top=1000;f.respond(held);await settle();
 assert.equal(p.textContent,'');assert.equal(p.style.minHeight,'40px','loss of viewport eligibility drops text, not the measured layout');
 node.rect.top=10;void f.owner.refresh();f.pending.at(-1).resolve({kind:'root_previews',items:[]});await settle();assert.equal(p.style.minHeight,'','a fresh visible ineligibility result retires the reservation');
});

test('metadata publication waits for refreshed references before requesting the all-or-nothing preview batch',async t=>{
 const f=fixture(t);f.owner.update(f.items);f.respond();await settle();
 const node=f.nodes.get('0'),p=node.querySelector('.personal-topic-preview');
 p.getBoundingClientRect=()=>({height:p.childElementCount?40:Number.parseFloat(p.style.minHeight)||0});
 // The real read model rejects the whole batch if even one old revision is sent.
 f.owner.changed({type:'ARCHIVE_CHANGED',cause:'EDIT_LIBRARY_TOPIC'});
 assert.equal(p.textContent,'','publication revokes text synchronously');
 assert.equal(p.style.minHeight,'40px');
 void f.owner.refresh();
 assert.equal(f.pending.length,1,'scroll cannot issue a stale-revision batch before directory hydration');
 node.rect.top=1000;f.items[0].revision++;
 f.owner.update(f.items);assert.equal(f.pending.length,2);
 assert.ok(f.pending[1].args.options.topics.every(ref=>ref.id!=='0'));
 f.respond(1);await settle();assert.equal(p.style.minHeight,'40px');
 f.owner.changed({type:'ARCHIVE_CHANGED',cause:'REMOVE_LIBRARY_TOPIC'});
 assert.equal(p.style.minHeight,'','real qualification change still drops reservations');
});

test('native readiness qualifies the current viewport instead of accepting the previous viewport settled state',async t=>{
 const {qualifyRootViewport,rootViewportSettled}=await import('./harness/root-viewport-readiness.mjs'),f=fixture(t),old=globalThis.__rootReadOwner;
 const controller={personalRoot:{previews:f.owner},homePage:{},homeCollection:{loading:false,hydration:null}};globalThis.__rootReadOwner=controller;t.after(()=>{if(old===undefined)delete globalThis.__rootReadOwner;else globalThis.__rootReadOwner=old;});
 const collection=new Node(),retry={hidden:true};f.doc.getElementById=id=>id==='thought-list'?f.host:id==='thought-collection'?collection:retry;
 f.owner.update(f.items);f.respond();await settle();assert.equal(rootViewportSettled(),true);
 // scrollTo has moved the viewport, but its queued scroll event has not fired.
 for(const [id,node]of f.nodes){node.rect.top=id==='20'?10:1000;node.rect.bottom=node.rect.top+100;}
 assert.equal(f.host.dataset.previewState,'settled','old viewport marker remains until its event');
 qualifyRootViewport();assert.equal(rootViewportSettled(),false,'held current qualification is never ready');assert.deepEqual(f.pending[1].args.options.topics.map(x=>x.id),['20']);
 f.pending[1].resolve({kind:'root_previews',items:[{topicId:'20',preview:null}]});await settle();assert.equal(rootViewportSettled(),true);assert.equal(f.host.dataset.retainedPreviewBodies,'0','missing eligibility does not manufacture a body or reserved height');
 for(const key of ['loading','hydration']){controller.homeCollection[key]=true;assert.equal(rootViewportSettled(),false);controller.homeCollection[key]=false;}
 controller.readFailed=true;assert.equal(rootViewportSettled(),false);controller.readFailed=false;retry.hidden=false;assert.equal(rootViewportSettled(),false);
});

test('same presentation preferences reapplication revokes text without collapsing an offscreen measured shell',async t=>{
 const f=fixture(t);f.owner.update(f.items);f.respond();await settle();const node=f.nodes.get('0'),p=node.querySelector('.personal-topic-preview');
 p.getBoundingClientRect=()=>({height:p.childElementCount?40:Number.parseFloat(p.style.minHeight)||0});node.rect.top=1000;void f.owner.refresh();assert.equal(p.style.minHeight,'40px');
 f.owner.preferences();assert.equal(p.textContent,'');assert.equal(p.style.minHeight,'40px','unchanged presentation is not a geometry invalidation');
 assert.equal(f.host.dataset.retainedPreviewBodies,'0');
 f.owner.changed({type:'ARCHIVE_CHANGED',cause:'REMOVE_LIBRARY_TOPIC'});assert.equal(p.style.minHeight,'','canonical qualification changes still retire the numeric shell');
});
for(const change of ['mask','locale','theme','width','style','hidden'])test('real '+change+' preference change retires measured geometry',async t=>{
 const f=fixture(t);f.owner.update(f.items);f.respond();await settle();const node=f.nodes.get('0'),p=node.querySelector('.personal-topic-preview');
 p.getBoundingClientRect=()=>({height:p.childElementCount?40:Number.parseFloat(p.style.minHeight)||0});node.rect.top=1000;void f.owner.refresh();assert.equal(p.style.minHeight,'40px');
 if(change==='theme')f.doc.documentElement.dataset={paiaTheme:'dark'};if(change==='mask')f.doc.documentElement.classList={contains:()=>true};if(change==='locale')f.doc.documentElement.lang='zh-CN';if(change==='width')f.host.clientWidth=500;if(change==='style')f.doc.documentElement.getAttribute=()=> '--paia-prose-size:19px';if(change==='hidden')f.doc.hidden=true;
 f.owner.preferences();assert.equal(p.textContent,'');assert.equal(p.style.minHeight,'');
});

test('actual settings applyPreferences publication of unchanged DOM presentation preserves only numeric offscreen geometry',async t=>{
 const f=fixture(t),{readFile}=await import('node:fs/promises'),source=await readFile(new URL('../ui/settings-preferences.js',import.meta.url),'utf8'),body=source.slice(source.indexOf('function applyPreferences(){'),source.indexOf('\nasync function loadPreferences'));
 const styles=new Map(),root=f.doc.documentElement;root.dataset={};root.style={setProperty:(key,value)=>styles.set(key,value)};root.getAttribute=()=>JSON.stringify([...styles]);f.doc.dispatchEvent=()=>f.owner.preferences();
 const local={preferences:{appearance:'light',fontSize:'standard',readingWidth:'standard'}};
 const apply=new Function('local',"let uxPreferences;const FONT_PX={standard:17},WIDTH_PX={standard:680},language=()=> 'en',resolveAppearance=value=>value,syncPreferenceControls=()=>{},syncSettingsLocale=()=>{};"+body+';return applyPreferences;')(local);
 apply();f.owner.update(f.items);f.respond();await settle();const node=f.nodes.get('0'),p=node.querySelector('.personal-topic-preview');p.getBoundingClientRect=()=>({height:p.childElementCount?40:Number.parseFloat(p.style.minHeight)||0});node.rect.top=1000;void f.owner.refresh();
 apply();assert.equal(p.textContent,'');assert.equal(p.style.minHeight,'40px');assert.equal(f.host.dataset.retainedPreviewBodies,'0');
 local.preferences.appearance='dark';apply();assert.equal(p.style.minHeight,'','actual changed theme identity invalidates the old geometry');
});
