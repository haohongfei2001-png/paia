import test from 'node:test';import assert from 'node:assert/strict';
import {editableText,editableTextSnapshot,NativeLineBreakTracker} from '../ui/editable-text.js';
const createRange=()=>({setStart(node,offset){this.startContainer=node;this.startOffset=offset;},setEnd(node,offset){this.endContainer=node;this.endOffset=offset;}});
const tracker=()=>new NativeLineBreakTracker({createRange});
const t=data=>({nodeType:3,data}),root=(...childNodes)=>({nodeType:1,nodeName:'DIV',childNodes});
const event=(changes={})=>({isTrusted:true,inputType:'insertLineBreak',isComposing:false,defaultPrevented:false,...changes});
const selection=(node,offset)=>({isCollapsed:true,anchorNode:node,anchorOffset:offset,focusNode:node,focusOffset:offset,rangeCount:1,getRangeAt:()=>({startContainer:node,startOffset:offset,endContainer:node,endOffset:offset})});
function inserted(body='HEAD',options={}){const owner=tracker(),text=t(body),field=root(text);owner.before(field,event(options.before),selection(text,body.length));const newline=t('\n'),sentinel=t('\n');field.childNodes.push(newline,sentinel);const before=JSON.stringify(field);owner.input(field,event(options.after),options.caret||selection(sentinel,0));assert.equal(JSON.stringify(field),before,'recognition never mutates native DOM');return {owner,text,field,newline,sentinel};}

test('native line-break provenance excludes only the newly inserted terminal caret Text node',()=>{
 const {field,sentinel}=inserted('👩‍💻\n\nHEAD'),snapshot=editableTextSnapshot(field);assert.equal(snapshot.text,'👩‍💻\n\nHEAD\n');assert.equal(snapshot.offset(sentinel,0),snapshot.text.length);assert.equal(snapshot.offset(sentinel,1),snapshot.text.length);const endpoint=snapshot.point(snapshot.text.length);assert.equal(snapshot.offset(endpoint.node,endpoint.offset),snapshot.text.length);
});
for(const [label,options]of [['untrusted before',{before:{isTrusted:false}}],['untrusted input',{after:{isTrusted:false}}],['composing before',{before:{isComposing:true}}],['composing input',{after:{isComposing:true}}],['cancelled before',{before:{defaultPrevented:true}}],['cancelled input',{after:{defaultPrevented:true}}],['paste before',{before:{inputType:'insertFromPaste'}}],['mismatched input',{after:{inputType:'insertText'}}]])test('native sentinel refuses '+label,()=>{assert.equal(editableText(inserted('HEAD',options).field),'HEAD\n\n');});

test('identical literal, pasted or reloaded two-LF DOM without native event proof remains exact',()=>{
 for(const field of [root(t('HEAD\n\n')),root(t('HEAD'),t('\n'),t('\n'))]){const owner=tracker(),tail=field.childNodes.at(-1);owner.input(field,event(),selection(tail,0));assert.equal(editableText(field),'HEAD\n\n');}
});

test('native sentinel refuses an old node, wrong caret or larger unexplained delta',()=>{
 for(const kind of ['old node','wrong caret','larger delta']){const owner=tracker(),text=t('HEAD'),old=t('\n'),field=root(text,...(kind==='old node'?[old]:[]));owner.before(field,event(),selection(text,4));const newline=t('\n'),candidate=kind==='old node'?old:t('\n');field.childNodes=[text,newline,candidate,...(kind==='larger delta'?[t('\n')]:[])];owner.input(field,event(),selection(candidate,kind==='wrong caret'?1:0));assert.equal(editableText(field),'HEAD'+'\n'.repeat(kind==='larger delta'?3:2));}
});

test('typing before a tracked terminal node retains provenance; its removal or mutation invalidates it',()=>{
 let {field,text,sentinel}=inserted();text.data='AHEAD';assert.equal(editableText(field),'AHEAD\n');field.childNodes=field.childNodes.filter(n=>n!==sentinel);field.childNodes.push(t('TAIL'));assert.equal(editableText(field),'AHEAD\nTAIL');
 ({field,sentinel}=inserted());sentinel.data='AUTHORED\n';assert.equal(editableText(field),'HEAD\nAUTHORED\n');
 ({field}=inserted());field.childNodes=[t('PASTED\n\n')];assert.equal(editableText(field),'PASTED\n\n');
});

test('a second native newline preserves the first authored break and existing sentinel identity',()=>{
 const {owner,field,sentinel}=inserted();owner.before(field,event(),selection(sentinel,0));field.childNodes.splice(-1,0,t('\n'));owner.input(field,event(),selection(sentinel,0));assert.equal(editableText(field),'HEAD\n\n');
});

test('paint/dispose clears provenance and never blesses a replacement canonical body',()=>{
 const {owner,field}=inserted();owner.clear(field);field.childNodes=[t('HEAD\n\n')];assert.equal(editableText(field),'HEAD\n\n');
});

for(const tag of ['BR','DIV','P'])test('appended '+tag+' invalidates a no-longer-terminal sentinel even without a later text node',()=>{
 const {field}=inserted();field.childNodes.push({nodeType:1,nodeName:tag,childNodes:[]});assert.equal(editableText(field),'HEAD\n\n\n');field.childNodes.pop();assert.equal(editableText(field),'HEAD\n\n','removing later structure cannot silently revive lost provenance');
});

test('unsupported replacement shape invalidates sentinel provenance before fallback',()=>{const {field}=inserted();field.innerText='EXACT FALLBACK';field.childNodes.push({nodeType:1,nodeName:'TABLE',childNodes:[]});assert.equal(editableText(field),'EXACT FALLBACK');field.childNodes.pop();assert.equal(editableText(field),'HEAD\n\n');});

function replacement({before='HEAD\n',payload='HEAD',after=payload+'\n',start=0,end=before.length,inputData=payload}={}){
 const ranges=[],owner=new NativeLineBreakTracker({createRange:()=>{const range=createRange();ranges.push(range);return range;}}),node=t(before),field=root(node),selected={...selection(node,start),isCollapsed:start===end,focusOffset:end,getRangeAt:()=>({startContainer:node,startOffset:start,endContainer:node,endOffset:end})};
 owner.before(field,event({inputType:'insertText',data:payload}),selected);node.data=after;owner.input(field,event({inputType:'insertText',data:inputData}),selection(node,typeof payload==='string'?payload.length:0));return {owner,node,field,ranges};
}
test('proved full-field insertText replacement tracks one reused-node character without dropping its prefix',()=>{const {field,node}=replacement(),snapshot=editableTextSnapshot(field);assert.equal(snapshot.text,'HEAD');assert.equal(snapshot.offset(node,4),4);assert.equal(snapshot.offset(node,5),4);assert.deepEqual(snapshot.point(4),{node,offset:4});});
for(const [label,options]of [['partial selection',{end:4}],['null data',{payload:null,after:'HEAD\n'}],['mismatched data',{inputData:'OTHER'}],['two unexplained extra LF',{after:'HEAD\n\n'}]])test('reused-node sentinel refuses '+label,()=>{const result=replacement(options);assert.equal(editableText(result.field),result.node.data);assert.equal(result.ranges.length,0);});
for(const payload of ['HEAD\n','HEAD\n\n','\n','\n\n',''])test('full replacement preserves exact authored payload '+JSON.stringify(payload),()=>{const {field}=replacement({payload,after:payload});assert.equal(editableText(field),payload);});
test('character exclusion follows a moved live range and refuses collapsed, widened or detached ranges',()=>{
 let r=replacement(),marker=r.ranges[0];r.node.data='BEFORE HEAD\n';marker.startOffset+=7;marker.endOffset+=7;assert.equal(editableText(r.field),'BEFORE HEAD');assert.equal(editableTextSnapshot(r.field).offset(r.node,12),11);
 for(const mode of ['collapsed','wide','detached']){r=replacement();marker=r.ranges[0];if(mode==='collapsed')marker.endOffset=marker.startOffset;else if(mode==='wide')marker.startOffset--;else r.field.childNodes=[t('HEAD\n')];assert.equal(editableText(r.field),'HEAD\n');}
});

for(const endpoint of ['previous text end','parent boundary'])test('proved full replacement accepts equivalent caret '+endpoint,()=>{
 const owner=tracker(),head=t('HEAD'),tail=t('\n'),field=root(head,tail),selected={...selection(field,0),isCollapsed:false,focusOffset:2,getRangeAt:()=>({startContainer:field,startOffset:0,endContainer:field,endOffset:2})};
 owner.before(field,event({inputType:'insertText',data:'HEAD'}),selected);owner.input(field,event({inputType:'insertText',data:'HEAD'}),endpoint==='previous text end'?selection(head,4):selection(field,1));assert.equal(editableText(field),'HEAD');
});
for(const endpoint of ['previous character','after LF'])test('full replacement refuses non-equivalent caret '+endpoint,()=>{
 const owner=tracker(),head=t('HEAD'),tail=t('\n'),field=root(head,tail),selected={...selection(field,0),isCollapsed:false,focusOffset:2,getRangeAt:()=>({startContainer:field,startOffset:0,endContainer:field,endOffset:2})};
 owner.before(field,event({inputType:'insertText',data:'HEAD'}),selected);owner.input(field,event({inputType:'insertText',data:'HEAD'}),endpoint==='previous character'?selection(head,3):selection(tail,1));assert.equal(editableText(field),'HEAD\n');
});

test('matching numeric caret offsets outside the field cannot establish replacement provenance',()=>{
 const owner=tracker(),head=t('HEAD'),tail=t('\n'),field=root(head,tail),outside=t('HEAD'),selected={...selection(field,0),isCollapsed:false,focusOffset:2,getRangeAt:()=>({startContainer:field,startOffset:0,endContainer:field,endOffset:2})};owner.before(field,event({inputType:'insertText',data:'HEAD'}),selected);owner.input(field,event({inputType:'insertText',data:'HEAD'}),selection(outside,4));assert.equal(editableText(field),'HEAD\n');
});
for(const tag of ['TABLE','SPAN'])test('unsupported '+tag+' mapping cannot prove replacement caret equivalence',()=>{
 const owner=tracker(),head=t('HEAD\n'),field=root(head),selected={...selection(head,0),isCollapsed:false,focusOffset:5,getRangeAt:()=>({startContainer:head,startOffset:0,endContainer:head,endOffset:5})};owner.before(field,event({inputType:'insertText',data:'HEAD'}),selected);const tail=t('\n'),block={nodeType:1,nodeName:'DIV',childNodes:[tail]};field.childNodes=[t('HEAD'),{nodeType:1,nodeName:tag,childNodes:[block]}];field.innerText='HEAD\n';owner.input(field,event({inputType:'insertText',data:'HEAD'}),selection(tail,0));assert.equal(editableText(field),'HEAD\n');assert.equal(editableTextSnapshot(field).offset(tail,0),null);
});
