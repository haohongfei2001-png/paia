import test from 'node:test';
import assert from 'node:assert/strict';
import {captureReaderFocus,restoreReaderFocus} from '../ui/reader-return-focus.js';
function fixture(body='A👩‍💻 éZ'){
 const node={nodeType:3,data:body,textContent:body},field={nodeType:1,nodeName:'DIV',childNodes:[node],dataset:{editId:'synthetic-input'},focus(){this.focused=true;},closest(selector){return selector==='[data-edit-id]'?this:row;}},more={focus(){this.focused=true;}},row={dataset:{blockId:'synthetic-input'},querySelector:()=>more},ranges=[],selection={setBaseAndExtent(...args){ranges.push(args);}},root={contains:value=>value===field,querySelectorAll:()=>[field],ownerDocument:{getSelection:()=>selection,getElementById:()=>null}},entry={local:{excluded:false}},editor={entries:new Map([['synthetic-input',entry]]),text:()=>body};return {node,field,more,root,entry,editor,ranges};
}
test('Reader return captures only logical reverse endpoints and restores grapheme-safe positions on a fresh body',()=>{
 const first=fixture(),saved=captureReaderFocus(first.root,{active:first.field,selection:{anchorNode:first.node,anchorOffset:9,focusNode:first.node,focusOffset:3}});assert.deepEqual(saved,{kind:'body',inputId:'synthetic-input',anchorOffset:9,focusOffset:3});assert.equal(JSON.stringify(saved).includes('👩'),false);
 const fresh=fixture('A👩‍💻 é');assert.equal(restoreReaderFocus(fresh.root,saved,fresh.editor),true);assert.equal(fresh.field.focused,true);assert.deepEqual(fresh.ranges[0],[fresh.node,9,fresh.node,1]);assert.equal(first.field.focused,undefined);
});
test('Reader return refuses removed or excluded targets and never moves selection outside its field',()=>{
 const f=fixture();f.entry.local.excluded=true;assert.equal(restoreReaderFocus(f.root,{kind:'body',inputId:'synthetic-input',anchorOffset:100,focusOffset:0},f.editor),false);assert.deepEqual(f.ranges,[]);assert.equal(restoreReaderFocus(f.root,{kind:'body',inputId:'removed'},f.editor),false);
 const saved=captureReaderFocus(f.root,{active:f.field,selection:{anchorNode:{nodeType:3,data:'outside'},anchorOffset:1,focusNode:f.node,focusOffset:1}});assert.deepEqual(saved,{kind:'body',inputId:'synthetic-input'});
});
test('Reader return restores the explicit margin action when it was the origin and safely drops unknown selection geometry',()=>{
 const f=fixture(),saved=captureReaderFocus(f.root,{active:null,selection:null,fallbackInputId:'synthetic-input'});assert.deepEqual(saved,{kind:'more',inputId:'synthetic-input'});assert.equal(restoreReaderFocus(f.root,saved,f.editor),true);assert.equal(f.more.focused,true);assert.deepEqual(f.ranges,[]);
 f.field.childNodes=[{nodeType:1,nodeName:'TABLE',childNodes:[]}];f.field.innerText='unknown shape';assert.equal(restoreReaderFocus(f.root,{kind:'body',inputId:'synthetic-input',anchorOffset:1,focusOffset:2},f.editor),true);assert.deepEqual(f.ranges,[]);
});
