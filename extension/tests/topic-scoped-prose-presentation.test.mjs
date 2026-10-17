import test from 'node:test';
import assert from 'node:assert/strict';
import {PresentationNode} from './harness/presentation-dom.mjs';
import {renderTopicSectionProse} from '../ui/topic-section-prose.js';
class Node extends PresentationNode{
 constructor(tag='div'){super(tag);this.style={};}
 querySelectorAll(selector){const rows=this.children.flatMap(node=>[node,...node.querySelectorAll('*')]);if(selector==='*')return rows;if(selector.startsWith('.'))return rows.filter(node=>node.classList.contains(selector.slice(1)));if(selector.startsWith('[data-')){const [,raw,value]=selector.match(/^\[data-([^=\]]+)(?:="([^"]*)")?\]$/)||[],key=raw?.replace(/-([a-z])/g,(_,x)=>x.toUpperCase());return rows.filter(node=>key in node.dataset&&(value===undefined||node.dataset[key]===value));}return rows.filter(node=>node.tagName===selector.toUpperCase());}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
const section=(id,title='SYNTHETIC real Section',rank='1')=>({sectionId:id,topicId:'topic',title,rank,isDefault:id==='default'});
const row=(id,sectionId='one')=>({entry:{id,lifecycle:'active',revision:1,body:'SYNTHETIC exact 👩🏽‍💻\n\n  const x = 1;\n诗。'},placement:{topicId:'topic',sectionId}});
const page=(sections,items,scopeSectionId=null)=>({kind:'section_reading',topic:{id:'topic',defaultSectionId:'default'},sections,items,...(scopeSectionId===null?{}:{scopeSectionId})});
function fixture(run){
 const prior=Object.getOwnPropertyDescriptor(globalThis,'document'),body=new Node('body'),root=new Node('div');body.append(root);let created=0,actions=0;
 globalThis.document={body,activeElement:body,createElement:tag=>new Node(tag)};
 const entryNode=({entry})=>{created++;const node=new Node('article');node.dataset.entryId=entry.id;const field=new Node('div');field.dataset.entryField='body';field.textContent=entry.body;field.contentEditable='plaintext-only';node.append(field);return node;};
 const sectionActions=(header,section)=>{actions++;const menu=new Node('details');menu.className='section-actions';menu.dataset.actionSection=section.sectionId;header.append(menu);};
 const render=(data,options={})=>renderTopicSectionProse({body:root,page:data,entryNode,sectionActions,...options});
 try{return run({root,render,entryNode,counts:()=>({created,actions})});}finally{if(prior)Object.defineProperty(globalThis,'document',prior);else delete globalThis.document;}
}
test('selected Section removes an earlier unscoped headline and menu while preserving its host, editor, focus and exact body',()=>fixture(({root,render,counts})=>{
 const item=row('first'),data=page([section('one')],[item]);render(data);const host=root.firstElementChild,entry=root.querySelector('[data-entry-id]'),field=entry.firstElementChild,header=host.firstElementChild,menu=header.querySelector('.section-actions');
 let nativeUndo=0;field.addEventListener('beforeinput',()=>nativeUndo++);field.focus();const before=structuredClone(data),original=counts();
 render({...data,scopeSectionId:'one'});assert.equal(root.firstElementChild,host);assert.equal(root.querySelector('[data-entry-id]'),entry);assert.equal(entry.firstElementChild,field);assert.equal(document.activeElement,field);assert.equal(field.textContent,item.entry.body);assert.equal(header.isConnected,false);assert.equal(menu.isConnected,false);assert.equal(root.querySelectorAll('h2').length,0);assert.equal(root.querySelectorAll('.section-heading').length,0);assert.equal(root.querySelectorAll('.section-actions').length,0);assert.deepEqual(counts(),original,'a scoped paint neither recreates bodies nor invokes heading actions');field.listeners.get('beforeinput')();assert.equal(nativeUndo,1);assert.deepEqual(data,before);
 render(data);assert.equal(root.firstElementChild,host);assert.equal(root.querySelector('[data-entry-id]'),entry);assert.deepEqual(root.querySelectorAll('h2').map(node=>node.textContent),['SYNTHETIC real Section']);assert.equal(counts().actions,original.actions+1,'unscoped consumers retain genuine Section actions');assert.equal(document.activeElement,field,'returning to unscoped headings cannot detach the retained native editor');
}));
for(const id of ['one','default'])test('explicit empty '+id+' keeps its real scoped host without manufactured heading or content',()=>fixture(({root,render,counts})=>{
 const data=page([section(id)],[],id),before=structuredClone(data);render(data);const host=root.firstElementChild;assert.equal(host.dataset.sectionId,id);assert.equal(host.children.length,0);assert.equal(root.textContent,'');assert.deepEqual(counts(),{created:0,actions:0});render(data);assert.equal(root.firstElementChild,host);assert.deepEqual(data,before);
}));
test('scoped large descriptors and omitted rows cannot replace pinned native drafts or their original undo listeners',()=>fixture(({root,render,counts})=>{
 const first=row('first'),second=row('second');render(page([section('one')],[first,second],'one'));const host=root.firstElementChild,entry=root.querySelectorAll('[data-entry-id]')[0],field=entry.firstElementChild;field.textContent='SYNTHETIC IME 未完成 👩🏽‍💻\n\n';field.focus();const undo=()=>{};field.addEventListener('beforeinput',undo);const original=counts();
 const descriptor={...first,entry:{id:'first',lifecycle:'active',revision:1,large:true}};render(page([section('one')],[descriptor,second],'one'),{pins:new Set(['first'])});render(page([section('one')],[second],'one'),{pins:new Set(['first'])});
 assert.equal(root.firstElementChild,host);assert.equal(root.querySelectorAll('[data-entry-id]').find(node=>node.dataset.entryId==='first'),entry);assert.equal(field.textContent,'SYNTHETIC IME 未完成 👩🏽‍💻\n\n');assert.equal(field.listeners.get('beforeinput'),undo);assert.equal(document.activeElement,field);assert.deepEqual(counts(),original);assert.equal(root.querySelectorAll('.section-heading').length,0);
}));
for(const selectedFirst of [true,false])test('late unscoped DOM siblings '+(selectedFirst?'after':'before')+' the selected host are removed without detaching its focused editor',()=>fixture(({root,render,counts})=>{
 const sections=selectedFirst?[section('one'),section('two','SYNTHETIC sibling','2')]:[section('two','SYNTHETIC sibling','0'),section('one')];
 render(page(sections,[row('first'),row('sibling','two')]));const selected=root.children.find(node=>node.dataset.sectionId==='one'),sibling=root.children.find(node=>node.dataset.sectionId==='two'),native=selected.querySelector('[data-entry-id]'),field=native.firstElementChild;field.focus();const original=counts();render(page([section('one')],[row('first')],'one'));
 assert.deepEqual(root.children,[selected]);assert.equal(root.querySelector('[data-entry-id]'),native);assert.equal(document.activeElement,field);assert.equal(sibling.isConnected,false);assert.equal(root.textContent.includes('sibling'),false);assert.equal(root.querySelectorAll('h2').length,0);assert.deepEqual(counts(),original);
}));
for(const defect of ['sibling metadata','sibling item','sibling spacer','missing target','foreign pin','unscoped pin','invalid target'])test('scoped renderer refuses '+defect+' before touching a prior editor or heading',()=>fixture(({root,render,counts})=>{
 const first=row('first'),sibling=row('sibling','two');render(page([section('one'),section('two','SYNTHETIC sibling','2')],[first,sibling]));const children=[...root.children],entries=root.querySelectorAll('[data-entry-id]'),field=entries[0].firstElementChild;field.textContent='SYNTHETIC protected draft';field.focus();const text=root.textContent,before=counts(),data=page([section('one')],[first],'one');let pins=new Set();
 if(defect==='sibling metadata')data.sections.push(section('two'));if(defect==='sibling item')data.items.push(sibling);if(defect==='sibling spacer')data.windowLayout=[{kind:'spacer',sectionId:'two',from:0,to:1,height:200}];if(defect==='missing target')data.sections=[];if(defect==='foreign pin')pins=new Set(['sibling']);if(defect==='unscoped pin'){pins=new Set(['sibling']);delete entries[1].dataset.sectionId;}if(defect==='invalid target')data.scopeSectionId=42;
 assert.throws(()=>render(data,{pins}),/TOPIC_SECTION_SCOPE_CHANGED/);assert.deepEqual(root.children,children);assert.deepEqual(root.querySelectorAll('[data-entry-id]'),entries);assert.equal(root.textContent,text);assert.equal(document.activeElement,field);assert.deepEqual(counts(),before);
}));
test('generic consumers retain human-ranked named and empty Section headlines and original actions',()=>fixture(({root,render,counts})=>{
 render(page([section('late','SYNTHETIC later','3'),section('default',''),section('empty','SYNTHETIC empty','2'),section('one','SYNTHETIC first','1')],[row('late','late'),row('first')]));assert.deepEqual(root.children.map(node=>node.dataset.sectionId),['one','empty','late']);assert.deepEqual(root.querySelectorAll('h2').map(node=>node.textContent),['SYNTHETIC first','SYNTHETIC empty','SYNTHETIC later']);assert.equal(root.querySelectorAll('.section-actions').length,3);assert.deepEqual(counts(),{created:2,actions:3});
}));
