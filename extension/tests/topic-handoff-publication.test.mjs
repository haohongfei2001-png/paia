import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {LibraryEntryEditor} from '../ui/library-entry-editor.js';
import {PresentationNode} from './harness/presentation-dom.mjs';

class Node extends PresentationNode{
 constructor(tag='div'){super(tag);this.style={};}
 get innerText(){return this.textContent;}
 matches(selector){return selector.split(',').some(value=>value.trim().toUpperCase()===this.tagName);}
 querySelectorAll(selector){const all=this.children.flatMap(node=>[node,...node.querySelectorAll('*')]);if(selector==='*')return all;if(selector.startsWith('.'))return all.filter(node=>node.classList.contains(selector.slice(1)));if(selector.startsWith('[data-')){const [,raw,value]=selector.match(/^\[data-([^=\]]+)(?:="([^"]*)")?\]$/)||[],key=raw?.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());return all.filter(node=>key in node.dataset&&(value===undefined||node.dataset[key]===value));}return all.filter(node=>node.tagName===selector.toUpperCase());}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 getBoundingClientRect(){return {top:140,bottom:180,height:40};}
}

// Actual reset/publication, reader snapshot/hydration, and metadata guards.
// The transport supplies qualified pages; only DOM geometry/painting is fake.
async function withPublication(run,{included=false,unavailable=false}={}){
 const names=['document','chrome','scrollY','requestAnimationFrame'],prior=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
 const body=new Node('body'),pane=new Node();body.append(pane);
 globalThis.document={body,activeElement:body,documentElement:{lang:'en'},createElement:tag=>new Node(tag)};globalThis.scrollY=0;globalThis.requestAnimationFrame=()=>0;
 const topic={id:'topic',name:'SYNTHETIC canonical Topic',summary:'',revision:1,recoveryEpoch:'epoch',authority:'authority'};
 const item=id=>({entry:{id,body:'SYNTHETIC canonical '+id,revision:1},placement:{topicId:'topic',sectionId:'section',revision:1},readingYear:2026});
 const page=ids=>({kind:'section_reading',scopeSectionId:'section',topic,authority:'authority',recoveryEpoch:'epoch',chronology:'expression',year:2026,nextYear:null,yearMetadata:{complete:true,pending:false},coverage:{activeGeneration:'generation',complete:true,start:true,end:true},sections:[{sectionId:'section',topicId:'topic',title:'SYNTHETIC Section',revision:1}],items:ids.map(item),previousCursor:null,nextCursor:null,sectionCursor:null});
 const calls=[],paints=[],metadata={beginQualifiedRead(){return this.qualifiedReadToken=Symbol();},receiveQualified(_row,token){return this.qualifiedReadToken===token;}};
 globalThis.chrome={runtime:{sendMessage:async message=>{
  calls.push(structuredClone(message));if(message.type==='GET_LIBRARY_TOPIC_READING_METADATA')return {ok:true,data:topic};
  assert.equal(message.type,'GET_LIBRARY_SECTION_READING');assert.equal(message.options.scopeSectionId,'section');
  if(unavailable&&message.options.anchorId==='new')return {ok:true,data:{cursorInvalid:true,anchorUnavailable:true}};
  return {ok:true,data:page(included?['old','new']:[message.options.anchorId||'old'])};
 }}};
 const owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',activeSectionId:'section',serial:1,statusEpoch:1,openIntent:1,rootCueEpoch:0,view:'original',originalMode:'content',readingSort:'asc',topicProviderKey:null,originalPane:pane,
  topicMetadata:()=>metadata,topicProtectedIds:()=>new Set(),topicContinuousVisible:()=>true,updateTopicContinuous(){},renderDocument(value){paints.push(value);},refreshTopicStamps(){},observeTopicWindowSpacers(){},loadRemainingTopicSections(){},onStatus(){},topicAnchor:()=>null,topicSectionAnchor:()=>null});
 try{
  const previous=owner.createTopicReader({anchorId:'old'});await previous.initial();const saved=previous.snapshot({id:'old',top:140});calls.length=0;
  return await run({owner,saved,calls,paints});
 }finally{for(const [name,descriptor]of prior)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}
}

test('an explicit newly acknowledged anchor absent from saved extent gets its own canonical initial page',()=>withPublication(async f=>{
 const result=await f.owner.resetTopicReader({anchorId:'new',saved:f.saved});
 assert.equal(result.paintRefused,false);assert.equal(result.stale,false);
 assert.deepEqual(f.owner.topicReader.items.map(item=>item.entry.id),['new'],'old snapshot cannot turn exact new-Entry arrival into old-window success');
 assert.equal(f.paints.length,1);assert.deepEqual(f.paints[0].items.map(item=>item.entry.body),['SYNTHETIC canonical new']);
 assert.equal(f.calls.filter(call=>call.type==='GET_LIBRARY_SECTION_READING'&&call.options.anchorId==='new').length,1);
 assert.equal(f.saved.extent[0].entry.id,'old','original body-free saved position is unchanged');
}));

test('an unavailable explicit new anchor cannot report success by restoring unrelated saved rows',()=>withPublication(async f=>{
 const result=await f.owner.resetTopicReader({anchorId:'new',saved:f.saved});
 assert.equal(result.stale,true);assert.equal(f.paints.length,0);assert.equal(f.owner.topicReader.anchorUnavailable,true);
 assert.ok(f.calls.some(call=>call.type==='GET_LIBRARY_SECTION_READING'&&call.options.anchorId==='new'));
},{unavailable:true}));

test('an explicit return anchor already in the saved extent keeps the exact full qualified window',()=>withPublication(async f=>{
 const result=await f.owner.resetTopicReader({anchorId:'new',saved:f.saved});
 assert.equal(result.paintRefused,false);assert.deepEqual(f.owner.topicReader.items.map(item=>item.entry.id),['old','new']);
 assert.equal(f.paints.length,1);assert.equal(f.owner.topicReader.positionRestored,true);
 assert.deepEqual(f.paints[0].items.map(item=>item.entry.body),['SYNTHETIC canonical old','SYNTHETIC canonical new']);
},{included:true}));

test('actual canonical render retains a handoff row in the same native editor while its connected field is pinned',()=>{
 const names=['document','getSelection'],prior=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
 const body=new Node('body'),pane=new Node(),heading=new Node();body.append(pane,heading);globalThis.document={body,activeElement:body,documentElement:{lang:'en'},createElement:tag=>new Node(tag),getElementById:id=>id==='topic-heading'?heading:null};globalThis.getSelection=()=>({rangeCount:0,isCollapsed:true});
 const row=id=>({id,body:'SYNTHETIC '+id,note:'',type:'idea',revision:1,lifecycle:'active',staleReasons:[],fieldRevisions:{body:0,note:0,type:0},recoveryEpoch:'epoch'}),old=row('old'),fresh=row('new');
 const node=entry=>{const article=new Node('article'),field=new Node();article.dataset.entryId=entry.id;article.dataset.sectionId='section';field.dataset.entryField='body';field.textContent=entry.body;article.append(field);return article;};
 const oldNode=node(old),freshNode=node(fresh),section=new Node('section');section.className='topic-section';section.dataset.sectionId='section';section.append(oldNode,freshNode);pane.append(section);const field=freshNode.firstElementChild;
 const state=value=>({saved:{body:value.body,note:value.note,type:value.type},local:{body:value.body,note:value.note,type:value.type},revision:value.revision,fieldRevisions:value.fieldRevisions,currentInputRevision:null});
 const entry=Object.assign(Object.create(LibraryEntryEditor.prototype),{root:pane,entries:new Map([['old',state(old)],['new',state(fresh)]]),recoveries:new Map([['old',{pending:false}],['new',{pending:false}]]),recoveryOps:new Map(),recoveryChecked:new Set(),surface:{composing:false},journal:{undo:[[{id:'new',field:'body',before:'',after:fresh.body}]],redo:[]}});
 const editor={entry,metadata:[]},journal=entry.journal,owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',activeSectionId:'section',openIntent:1,view:'original',editor,originalPane:pane,aiPane:new Node(),document:{authority:'authority',recoveryEpoch:'epoch'},applyLayout(){},renderSectionNav(){}});
 owner.sectionEndHandoff={id:'new',field,owner:editor,topicId:'topic',sectionId:'section',authority:'authority',recoveryEpoch:'epoch'};
 const page={kind:'section_reading',scopeSectionId:'section',topic:{id:'topic'},authority:'authority',recoveryEpoch:'epoch',sections:[{sectionId:'section',title:'SYNTHETIC Section'}],items:[{entry:old,placement:{topicId:'topic',sectionId:'section'}}],nextCursor:null,previousCursor:null,sectionCursor:null};
 try{
  assert.equal(entry.protectedIds().has('new'),false,'this pin comes only from acknowledged handoff, not focus/draft/selection');
  owner.renderDocument(page);
  assert.equal(field.isConnected,true);assert.equal(freshNode.firstElementChild,field);assert.equal(entry.entries.has('new'),true,'DOM retention and collect/flush/tracked owner must retain the same Entry');
  assert.equal(owner.editor,editor);assert.equal(entry.journal,journal);assert.equal(journal.undo.length,1);assert.equal(entry.dirty(),false);
 }finally{for(const [name,descriptor]of prior)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}
});
