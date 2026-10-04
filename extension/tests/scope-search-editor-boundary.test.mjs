import test from 'node:test';
import assert from 'node:assert/strict';
import {DocumentEditor} from '../ui/library.js';
import {isolateScopeSearchEditing} from '../ui/components/scope-search.js';

class Node {
 constructor(id,parent=null){this.id=id;this.parentElement=parent;this.listeners=new Map();}
 addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(fn);}
 contains(node){return node===this||!!node?.parentElement&&this.contains(node.parentElement);}
 closest(selector){return selector==='#'+this.id?this:this.parentElement?.closest(selector)||null;}
 fire(event){event.target=this;event.defaultPrevented=false;event.stopped=false;event.preventDefault=()=>event.defaultPrevented=true;event.stopPropagation=()=>event.stopped=true;for(let node=this;node&&!event.stopped;node=node.parentElement)for(const fn of node.listeners.get(event.type)||[])fn(event);return event;}
}
async function fixture(run){
 const previous=globalThis.document,root=new Node('document-page'),title=new Node('document-title',root),host=new Node('scope-search-host',root),input=new Node('scope-search',host);title.innerText='SYNTHETIC saved title';
 root.querySelector=selector=>selector==='#document-title'?title:null;root.querySelectorAll=()=>[];globalThis.document={getSelection:()=>null};
 class LocalEditor extends DocumentEditor{async restoreRecovery(){return true;}}
 const observed={history:0,collect:0,composition:0,searchInput:0,rootEvents:0};
 const editor=new LocalEditor(root,{library:{blocks:[]},records:[],recoveryEpoch:'synthetic'}, {id:'synthetic-document',userTitle:title.innerText,originalConversationTitle:title.innerText,titleRevision:1},()=>{},()=>{});
 editor.history=async()=>observed.history++;const collect=editor.collect.bind(editor);editor.collect=()=>{observed.collect++;collect();};editor.protectComposition=async()=>observed.composition++;
 input.addEventListener('input',()=>observed.searchInput++);isolateScopeSearchEditing(host);
 for(const type of ['keydown','beforeinput','input','compositionstart','compositionend','focusout'])root.addEventListener(type,()=>observed.rootEvents++);
 try{await editor.recoveryReady;await run({root,title,host,input,editor,observed});}
 finally{editor.dispose();if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
}
test('compact search native undo/redo cannot invoke installed DocumentEditor history handlers',()=>fixture(({input,observed})=>{
 for(const event of [{type:'keydown',key:'z',ctrlKey:true},{type:'keydown',key:'Z',metaKey:true,shiftKey:true},{type:'keydown',key:'y',ctrlKey:true},{type:'keydown',key:'y',ctrlKey:true,altKey:true},{type:'keydown',key:'Y',metaKey:true,altKey:true},{type:'beforeinput',inputType:'historyUndo'},{type:'beforeinput',inputType:'historyRedo'}])assert.equal(input.fire(event).defaultPrevented,false,'search retains its native editing default');
 assert.equal(observed.history,0);assert.equal(observed.rootEvents,0);
}));
test('compact search composition and input remain with search without creating a document draft',()=>fixture(({input,editor,observed})=>{
 for(const type of ['compositionstart','input','compositionend','focusout'])input.fire({type});
 assert.equal(observed.searchInput,1);assert.equal(observed.collect,0);assert.equal(observed.composition,0);assert.equal(observed.rootEvents,0);assert.equal(editor.composing,false);assert.equal(editor.surface.composing,false);assert.equal(editor.dirty(),false);
}));
test('search Escape and ordinary shortcuts still propagate to existing navigation owners',()=>fixture(({input,observed})=>{
 for(const event of [{type:'keydown',key:'Escape'},{type:'keydown',key:'k',metaKey:true},{type:'keydown',key:'ArrowDown'}])assert.equal(input.fire(event).stopped,false);
 assert.equal(observed.rootEvents,3);assert.equal(observed.history,0);
}));
test('the actual title retains its existing document undo owner',()=>fixture(({title,observed})=>{
 const event=title.fire({type:'keydown',key:'z',ctrlKey:true});assert.equal(event.defaultPrevented,true);assert.equal(observed.history,1);
}));
test('search outside the editor does not suppress normal event bubbling',()=>fixture(({host,input})=>{
 host.parentElement=new Node('archive-root-header-actions');assert.equal(input.fire({type:'input'}).stopped,false);assert.equal(input.fire({type:'keydown',key:'z',ctrlKey:true}).stopped,false);
}));
