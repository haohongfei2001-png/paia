import test from 'node:test';
import assert from 'node:assert/strict';
import {editableText,editableTextSnapshot} from '../ui/editable-text.js';
import {captureReaderSelection} from '../ui/reader-selection.js';
const t=data=>({nodeType:3,data,textContent:data});
const e=(nodeName,...childNodes)=>({nodeType:1,nodeName,childNodes,innerText:'SYNTHETIC layout-derived fallback'});
const br=()=>e('BR'),line=(...nodes)=>e('DIV',...nodes);
for(const [label,dom,wanted]of [
 ['literal text retains all whitespace and Unicode',line(t(' \n\nA\t👩‍💻 é  \n\n')),' \n\nA\t👩‍💻 é  \n\n'],
 ['empty editor',line(),''],['sole caret BR',line(br()),''],['empty browser line',line(line(br())),''],
 ['observed empty DIV is one blank line',line(t('A'),line(br()),line(t('B'))),'A\n\nB'],
 ['two empty browser lines remain two',line(t('A'),line(br()),line(br()),line(t('B'))),'A\n\n\nB'],
 ['leading empty line',line(line(br()),t('A')),'\nA'],['trailing empty line',line(t('A'),line(br())),'A\n'],
 ['only empty lines',line(line(br()),line(br()),line(br())),'\n\n'],
 ['internal BR',line(t('A'),br(),t('B')),'A\nB'],['consecutive internal BRs',line(t('A'),br(),br(),t('B')),'A\n\nB'],
 ['native terminal BR placeholder',line(t('A'),br(),br()),'A\n'],
 ['explicit lone trailing BR',line(t('A'),br()),'A\n'],
 ['plain paragraph containers',line(e('P',t('A')),e('P',t('B'))),'A\nB'],
 ['nested line containers',line(line(t('A'),line(t('B'))),line(t('C'))),'A\nB\nC'],
 ['inline wrappers do not invent breaks',line(e('SPAN',t('A ')),e('MARK',t(' B'))),'A  B'],
 ['literal markup stays literal',line(t('<div><br></div> &nbsp;')),'<div><br></div> &nbsp;'],
 ['empty text and comments do not invent lines',line(t(''),{nodeType:8,data:'not user text'},t('A')),'A']
])test('D5 plaintext DOM read: '+label,()=>{const before=JSON.stringify(dom);assert.equal(editableText(dom),wanted);assert.equal(JSON.stringify(dom),before,'reading never rewrites native DOM');});

test('D5 logical offsets cross line boundaries and supplementary Unicode without counting a placeholder BR',()=>{
 const first=t('A👩‍💻'),empty=line(br()),last=t('B é'),lastLine=line(last),root=line(first,empty,lastLine),snapshot=editableTextSnapshot(root);
 assert.equal(snapshot.text,'A👩‍💻\n\nB é');assert.equal(snapshot.offset(first,1),1);assert.equal(snapshot.offset(last,0),8);assert.equal(snapshot.offset(last,4),12);
 assert.equal(snapshot.offset(root,1),6);assert.equal(snapshot.offset(empty,0),7);assert.equal(snapshot.offset(empty,1),7);assert.equal(snapshot.offset(root,2),7);assert.equal(snapshot.offset(lastLine,0),8);
 assert.deepEqual(snapshot.point(8),{node:last,offset:0});assert.deepEqual(snapshot.point(11),{node:last,offset:3});assert.equal(snapshot.offset(last,5),null);assert.equal(snapshot.point(13),null);
 for(let i=0;i<=snapshot.text.length;i++){const point=snapshot.point(i);assert.ok(point,'every logical offset has a DOM endpoint: '+i);assert.equal(snapshot.offset(point.node,point.offset),i,'endpoint roundtrip: '+i);}
});

test('D5 leading, trailing and all-empty line endpoints roundtrip without shifting into adjacent text',()=>{
 for(const root of [line(line(br()),line(t('A')),line(br()),line(br())),line(br(),br(),br()),line(line(br()),line(br()),line(br()))]){
  const snapshot=editableTextSnapshot(root);for(let i=0;i<=snapshot.text.length;i++){const point=snapshot.point(i);assert.ok(point);assert.equal(snapshot.offset(point.node,point.offset),i);}
 }
});

test('D5 selection uses the exact same logical body and endpoint map as the save owner',()=>{
 const first=t('A👩‍💻'),last=t('B é'),field=line(first,line(br()),line(last));field.dataset={editId:'SYNTHETIC_INPUT'};
 const all=new Set();const visit=n=>{all.add(n);for(const c of n.childNodes||[])visit(c);};visit(field);field.contains=n=>all.has(n);first.parentElement={closest:()=>field};last.parentElement={closest:()=>field};
 const range={commonAncestorContainer:field,startContainer:first,startOffset:1,endContainer:last,endOffset:3,cloneRange(){return this;}};
 const selection={rangeCount:1,isCollapsed:false,getRangeAt:()=>range,toString:()=> '👩‍💻\n\n\nB e'};
 const captured=captureReaderSelection(field,selection);assert.equal(captured.text,'👩‍💻\n\nB e');assert.deepEqual(captured.input,{id:'SYNTHETIC_INPUT',span:{start:1,end:11},body:'A👩‍💻\n\nB é'});assert.equal(captured.input.body.slice(captured.input.span.start,captured.input.span.end),captured.text);
});

test('D5 unfamiliar rich structure keeps existing extraction and refuses guessed selection offsets',()=>{
 const root=e('DIV',e('TABLE',t('SYNTHETIC'))),snapshot=editableTextSnapshot(root);assert.equal(snapshot.text,root.innerText);assert.equal(snapshot.offset(root,0),null);assert.equal(snapshot.point(0),null);
});
