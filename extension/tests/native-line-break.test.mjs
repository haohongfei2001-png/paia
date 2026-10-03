import test from 'node:test';import assert from 'node:assert/strict';
import {editableText,editableTextSnapshot,NativeLineBreakTracker} from '../ui/editable-text.js';
const createRange=()=>({setStart(node,offset){this.startContainer=node;this.startOffset=offset;},setEnd(node,offset){this.endContainer=node;this.endOffset=offset;}});
const tracker=()=>new NativeLineBreakTracker({createRange});
const t=data=>({nodeType:3,data}),root=(...childNodes)=>({nodeType:1,nodeName:'DIV',childNodes});
const event=(changes={})=>({isTrusted:true,inputType:'insertLineBreak',isComposing:false,defaultPrevented:false,...changes});
const selection=(node,offset)=>({isCollapsed:true,anchorNode:node,anchorOffset:offset,focusNode:node,focusOffset:offset,rangeCount:1,getRangeAt:()=>({startContainer:node,startOffset:offset,endContainer:node,endOffset:offset})});
function inserted(body='HEAD',options={}){const owner=options.owner||tracker(),text=t(body),field=root(text);owner.before(field,event(options.before),selection(text,body.length));const newline=t('\n'),sentinel=t('\n');field.childNodes.push(newline,sentinel);const before=JSON.stringify(field);owner.input(field,event(options.after),options.caret||selection(sentinel,0));assert.equal(JSON.stringify(field),before,'recognition never mutates native DOM');return {owner,text,field,newline,sentinel};}

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

function residue({inputData=null,oldIdentity=true,covered=true,expected='\n\n',extra=false,wrongCaret=false,invalidRange=null}={}){
 const ranges=[],owner=new NativeLineBreakTracker({createRange:()=>{const range=createRange();ranges.push(range);return range;}}),r=inserted('HEAD',{owner}),node=r.sentinel,prior=r.field,range={startContainer:prior,startOffset:0,endContainer:prior,endOffset:prior.childNodes.length,isPointInRange:()=>covered},selected={...selection(prior,0),isCollapsed:false,getRangeAt:()=>range};
 r.owner.before(prior,event({inputType:'insertText',data:expected}),selected);const leftover=oldIdentity?node:t('\n'),first=root(leftover),second=root({nodeType:1,nodeName:'BR',childNodes:[]}),last=root({nodeType:1,nodeName:'BR',childNodes:[]});prior.childNodes=[first,second,last,...(extra?[root({nodeType:1,nodeName:'BR',childNodes:[]})]:[])];leftover.parentNode=first;if(invalidRange==='collapsed')ranges[0].endOffset=ranges[0].startOffset;if(invalidRange==='wide')ranges[0].endOffset++;r.owner.input(prior,event({inputType:'insertText',data:inputData}),selection(wrongCaret?second:last,0));return {...r,first,last,leftover,ranges};
}
test('trusted full replacement re-proves only its selected old sentinel residue before new empty blocks',()=>{
 const r=residue();assert.equal(editableText(r.field),'\n\n');const read=editableTextSnapshot(r.field);assert.equal(read.offset(r.leftover,0),0);assert.equal(read.offset(r.leftover,1),0);assert.equal(read.offset(r.last,0),2);r.owner.input(r.field,event({inputType:'insertText',data:null}),selection(r.last,0));assert.equal(editableText(r.field),'\n\n','second native data-less input does not discard proven residue');
});
for(const [name,options]of [['new LF identity',{oldIdentity:false}],['old character outside pre-selection',{covered:false}],['non-null mismatched payload',{inputData:'OTHER'}],['wrong expected payload',{expected:'\n'}],['extra structural line',{extra:true}],['nonterminal post-caret',{wrongCaret:true}]])test('replacement residue refuses '+name,()=>{const r=residue(options);assert.equal(editableText(r.field),'\n'.repeat(options.extra?4:3));});
test('replacement residue invalidates after range mutation, detachment or moving to another parent',()=>{
 for(const kind of ['character','detached','parent']){const r=residue();if(kind==='character'){r.leftover.data='AUTHORED\n';assert.equal(editableText(r.field),'AUTHORED\n\n\n');}else if(kind==='detached'){r.first.childNodes=[t('\n')];assert.equal(editableText(r.field),'\n\n\n');}else{r.leftover.parentNode={};assert.equal(editableText(r.field),'\n\n\n');}}
});

for(const invalidRange of ['collapsed','wide'])test('invalid '+invalidRange+' old marker cannot be reclassified from coincidental strings',()=>{const r=residue({invalidRange});assert.equal(editableText(r.field),'\n\n\n');});

function coexist(){
 const r=residue(),tail=t('TAIL');r.last.childNodes=[tail];tail.parentNode=r.last;assert.equal(editableText(r.field),'\n\nTAIL');r.owner.before(r.field,event(),selection(tail,4));const authored=t('\n'),placeholder=t('\n');r.last.childNodes.push(authored,placeholder);authored.parentNode=r.last;placeholder.parentNode=r.last;r.owner.input(r.field,event(),selection(placeholder,0));return {...r,tail,authored,placeholder};
}
test('independently proved residue and later terminal LF coexist without adding a saved newline',()=>{
 const r=coexist(),snapshot=editableTextSnapshot(r.field);assert.equal(snapshot.text,'\n\nTAIL\n');assert.equal(r.ranges.length,2);for(let i=0;i<=snapshot.text.length;i++){const at=snapshot.point(i);assert.equal(snapshot.offset(at.node,at.offset),i);}assert.equal(snapshot.offset(r.leftover,1),0);assert.equal(snapshot.offset(r.placeholder,1),7);
 r.owner.input(r.field,event(),selection(r.placeholder,0));assert.equal(r.ranges.length,2);assert.equal(editableText(r.field),'\n\nTAIL\n','repeated input cannot duplicate an exclusion');
});
for(const invalid of ['residue','terminal','both'])test('pruning invalid '+invalid+' markers keeps other independent provenance',()=>{
 const r=coexist();if(invalid!=='terminal')r.ranges[0].endOffset=r.ranges[0].startOffset;if(invalid!=='residue')r.ranges[1].endOffset=r.ranges[1].startOffset;assert.equal(editableText(r.field),'\n'.repeat(invalid==='terminal'?2:3)+'TAIL'+'\n'.repeat(invalid==='residue'?1:2));
});
test('both live character ranges preserve prefix edits and supplementary Unicode endpoint roundtrips',()=>{
 const r=coexist(),prefix='👩‍💻 ';r.leftover.data=prefix+'\n';r.ranges[0].startOffset+=prefix.length;r.ranges[0].endOffset+=prefix.length;r.tail.data='OTHER TAIL';const snapshot=editableTextSnapshot(r.field);assert.equal(snapshot.text,prefix+'\n\nOTHER TAIL\n');for(let i=0;i<=snapshot.text.length;i++){const at=snapshot.point(i);assert.equal(snapshot.offset(at.node,at.offset),i);}
});
test('terminal marker moving to another parent is pruned without dropping the valid residue',()=>{
 const r=coexist();r.last.childNodes.pop();const block=root(r.placeholder);block.parentNode=r.field;r.placeholder.parentNode=block;r.field.childNodes.push(block);assert.equal(editableText(r.field),'\n\nTAIL\n\n\n');
});
test('full replacement clears both markers before preserving an exact literal replacement',()=>{
 const r=coexist(),selected={...selection(r.field,0),isCollapsed:false,getRangeAt:()=>({startContainer:r.field,startOffset:0,endContainer:r.field,endOffset:r.field.childNodes.length,isPointInRange:()=>true})};r.owner.before(r.field,event({inputType:'insertText',data:'EXACT\n\n'}),selected);const node=t('EXACT\n\n');r.field.childNodes=[node];r.owner.input(r.field,event({inputType:'insertText',data:'EXACT\n\n'}),selection(node,node.data.length));assert.equal(editableText(r.field),'EXACT\n\n');
});
test('ambiguous old characters cannot be selected merely because either exclusion matches replacement bytes',()=>{
 const r=coexist(),payload='\n'.repeat(4),selected={...selection(r.field,0),isCollapsed:false,getRangeAt:()=>({startContainer:r.field,startOffset:0,endContainer:r.field,endOffset:r.field.childNodes.length,isPointInRange:()=>true})};r.owner.before(r.field,event({inputType:'insertText',data:payload}),selected);r.tail.data='';r.owner.input(r.field,event({inputType:'insertText',data:payload}),selection(r.placeholder,1));assert.equal(editableText(r.field),'\n'.repeat(5),'ambiguous proof preserves all current bytes');
});
test('paint or unsupported structure invalidates both markers without reviving them later',()=>{
 for(const mode of ['paint','unsupported']){const r=coexist();if(mode==='paint')r.owner.clear(r.field);else{r.field.childNodes.push({nodeType:1,nodeName:'TABLE',childNodes:[]});r.field.innerText='EXACT FALLBACK';assert.equal(editableText(r.field),'EXACT FALLBACK');r.field.childNodes.pop();}assert.equal(editableText(r.field),'\n\n\nTAIL\n\n');}
});

function retainedBR({withResidue=true,replaceBR=false,wrongCaret=false,beforeEvent={},afterEvent={}}={}){
 const r=withResidue?residue():(()=>{const owner=tracker(),last=root({nodeType:1,nodeName:'BR',childNodes:[]}),field=root(last);return {owner,last,field};})(),br=r.last.childNodes[0];br.parentNode=r.last;r.last.parentNode=r.field;
 r.owner.before(r.field,event(beforeEvent),selection(r.last,0));const literal=t('\n'),afterBR=replaceBR?{nodeType:1,nodeName:'BR',childNodes:[]}:br;literal.parentNode=r.last;afterBR.parentNode=r.last;r.last.childNodes=[literal,afterBR];r.owner.input(r.field,event(afterEvent),selection(r.last,wrongCaret?2:1));return {...r,br:afterBR,literal};
}
for(const withResidue of [false,true])test('matched native LF retains only the same previously zero-character BR'+(withResidue?' beside proved residue':''),()=>{
 const r=retainedBR({withResidue}),snapshot=editableTextSnapshot(r.field),expected='\n'.repeat(withResidue?3:1);assert.equal(snapshot.text,expected);assert.equal(snapshot.offset(r.last,1),expected.length);assert.equal(snapshot.offset(r.last,2),expected.length);assert.equal(snapshot.offset(r.br,0),expected.length);for(let i=0;i<=expected.length;i++){const at=snapshot.point(i);assert.equal(snapshot.offset(at.node,at.offset),i);}r.owner.input(r.field,event(),selection(r.last,1));assert.equal(editableText(r.field),expected);
});
for(const [name,options]of [['replacement BR',{replaceBR:true}],['after-BR caret',{wrongCaret:true}],['untrusted before',{beforeEvent:{isTrusted:false}}],['composing before',{beforeEvent:{isComposing:true}}],['mismatched event',{afterEvent:{inputType:'insertText'}}]])test('retained caret BR refuses '+name,()=>{assert.equal(editableText(retainedBR(options).field),'\n'.repeat(4));});
test('literal/pasted/reloaded LF followed by BR is never excluded without matched native identity proof',()=>{
 for(const body of ['\n','TEXT\n','\n\n']){const field=root(root(t(body),{nodeType:1,nodeName:'BR',childNodes:[]}));assert.equal(editableText(field),body+'\n');}
});
test('retained BR proof is invalidated by changed predecessor, replacement, appended structure or owner clear',()=>{
 for(const mode of ['predecessor','replacement','appended','clear']){const r=retainedBR();if(mode==='predecessor'){r.literal.data='X\n';assert.equal(editableText(r.field),'\n\nX\n\n');}else if(mode==='replacement'){r.last.childNodes[1]={nodeType:1,nodeName:'BR',childNodes:[],parentNode:r.last};assert.equal(editableText(r.field),'\n'.repeat(4));}else if(mode==='appended'){r.field.childNodes.push(root({nodeType:1,nodeName:'BR',childNodes:[]}));assert.equal(editableText(r.field),'\n'.repeat(5));}else{r.owner.clear(r.field);assert.equal(editableText(r.field),'\n'.repeat(5));}}
});
