import test from 'node:test';
import assert from 'node:assert/strict';
import {SmartFilterUI} from '../ui/smart-filter.js';
import {PresentationNode,presentationText} from './harness/presentation-dom.mjs';
const hit={id:'input-synthetic',documentId:'document-synthetic',title:'Synthetic location',text:'Do not publish unless approved. 中文 👩‍💻 é.',providerKey:'chatgpt',sourceSentAt:'2021-01-01T00:00:00Z'};
function fixture(run){
 const old=globalThis.document,nodes=new Map(['document-list','result-count','empty-list','empty-sync'].map(id=>[id,new PresentationNode()])),activated=[];
 let selection=null;globalThis.document={documentElement:{lang:'en'},createElement:tag=>new PresentationNode(tag),createTextNode:presentationText,getElementById:id=>nodes.get(id),getSelection:()=>selection};
 const ui=Object.create(SmartFilterUI.prototype);ui.onContext=(...ids)=>activated.push(ids);
 try{return run({nodes,activated,render:(items,query='',nextCursor=null)=>ui.renderResults({items,nextCursor},query),select:value=>selection=value});}finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}
}
test('IAH11 production renderer is Input-first with real secondary provenance and stable owner order/identity',()=>fixture(({nodes,render,activated})=>{
 const items=[Object.freeze({...hit,rank:2}),Object.freeze({...hit,id:'second',title:'Different',rank:0})];render(items,'approved');
 const rows=nodes.get('document-list').children;assert.deepEqual(rows.map(row=>row.dataset.inputId),['input-synthetic','second']);
 assert.equal(rows[0].firstElementChild.className,'search-excerpt');assert.equal(rows[0].firstElementChild.textContent,hit.text);
 assert.equal(rows[0].children[1].tagName,'SMALL');assert.equal(rows[0].children[1].textContent,'Synthetic location');assert.equal(rows[0].children[2].textContent.includes('2021'),true);
 rows[0].listeners.get('click')({detail:0});assert.deepEqual(activated,[[hit.documentId,hit.id]]);assert.equal(nodes.get('result-count').textContent,'This page: 2 matching Inputs');
}));
test('IAH11 title-only match does not invent body emphasis, project attribution or send time',()=>fixture(({nodes,render})=>{
 render([{...hit,providerKey:null,title:'needle title',sourceSentAt:'invalid',text:'Exact unrelated Input',filtered:true}],'needle');const row=nodes.get('document-list').firstElementChild;
 assert.equal(row.firstElementChild.textContent,'Exact unrelated Input');assert.equal(row.firstElementChild.children.length,0);assert.equal(row.children[1].textContent,'needle title');assert.equal(row.children[2].textContent,'Send time unknown');assert.equal(row.children[3].textContent,'Conversation title match');assert.equal(row.children[4].textContent,'Smart-filtered content');
}));
test('IAH11 long Unicode excerpt preserves literal input and honest truncation',()=>fixture(({nodes,render})=>{
 const text='中文 👩‍💻 é '.repeat(100)+'Do not send NEEDLE unless approved. '+ '尾部'.repeat(150);render([{...hit,text}],'NEEDLE');const excerpt=nodes.get('document-list').firstElementChild.firstElementChild.textContent;
 assert.match(excerpt,/Do not send NEEDLE unless approved\./);assert.ok(text.includes(excerpt.replace(/^…|…$/g,'')));assert.match(excerpt,/^…/);assert.match(excerpt,/…$/);assert.equal(/\p{Surrogate}/u.test(excerpt),false);
}));
test('IAH11 selection suppresses pointer activation only in this row, retaining native keyboard activation',()=>fixture(({nodes,render,select,activated})=>{
 render([hit]);const row=nodes.get('document-list').firstElementChild,click=row.listeners.get('click');select({isCollapsed:false,rangeCount:1,getRangeAt:()=>({intersectsNode:n=>n===row})});click({detail:1});assert.equal(activated.length,0);click({detail:0});assert.equal(activated.length,1);
 select({isCollapsed:false,rangeCount:1,getRangeAt:()=>({intersectsNode:()=>false})});click({detail:1});assert.equal(activated.length,2);
}));
test('IAH11 continuation is not an empty answer; unknown metadata remains unknown',()=>fixture(({nodes,render})=>{
 render([],'needle',{phase:2,offset:50});assert.equal(nodes.get('empty-list').hidden,false);assert.equal(nodes.get('empty-list').textContent,'Continuing to search local Inputs…');render([],'needle');assert.match(nodes.get('empty-list').textContent,/No matches/);
 render([{...hit,title:'',providerKey:null,sourceSentAt:null}]);const row=nodes.get('document-list').firstElementChild;assert.equal(row.children[1].textContent,'Location unknown');assert.equal(row.children[2].textContent,'Send time unknown');
}));
