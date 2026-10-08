import test from 'node:test';
import assert from 'node:assert/strict';
import {firstLexicalRange,highlightReading,highlightText} from '../ui/search-experience.js';
import {PresentationNode,presentationText} from './harness/presentation-dom.mjs';
function fixture(text,run){
 const keys=['document','NodeFilter','Range','CSS','Highlight'],old=Object.fromEntries(keys.map(k=>[k,globalThis[k]]));
 const node={data:text,parentElement:{closest:()=>false}},root={};
 globalThis.document={createTreeWalker:()=>{let read=false;return {nextNode:()=>read?null:(read=true,node)};},createElement:t=>new PresentationNode(t),createTextNode:presentationText};
 globalThis.NodeFilter={SHOW_TEXT:4};globalThis.Range=class {setStart(n,v){assert.ok(v<=n.data.length);this.startOffset=v;}setEnd(n,v){assert.ok(v<=n.data.length);this.endOffset=v;}};
 globalThis.CSS={highlights:new Map()};globalThis.Highlight=class extends Array {constructor(...ranges){super(...ranges);}};
 try{run({root,node});}finally{for(const k of keys)if(old[k]===undefined)delete globalThis[k];else globalThis[k]=old[k];}
}
for(const [text,query,start,end] of [['İx','x',1,2],['ＡＢ','ab',0,2],['e\u0301x','é',0,2],['ﬃx','fi',0,1],['👩🏽‍💻 Ａ','a',8,9],['ΟΣ','ος',0,2],['  Ａ  ','a',2,3]])test('original-safe lexical range '+JSON.stringify([text,query]),()=>fixture(text,({root,node})=>{
 const found=firstLexicalRange(root,query);assert.ok(found);assert.deepEqual([found.startOffset,found.endOffset],[start,end]);
 highlightReading(root,query);const ranges=CSS.highlights.get('paia-search');assert.equal(ranges.length,1);assert.deepEqual([ranges[0].startOffset,ranges[0].endOffset],[start,end]);assert.equal(node.data,text);
 const result=new PresentationNode();highlightText(result,text,query);assert.equal(result.textContent,text);assert.equal(result.children.find(n=>n.tagName==='MARK').textContent,text.slice(start,end));
}));
test('absent and blank queries do not invent a match',()=>fixture('SYNTHETIC literal',({root})=>{assert.equal(firstLexicalRange(root,'missing'),null);assert.equal(firstLexicalRange(root,'  '),null);}));
test('expanded grapheme matches do not duplicate original text or overlapping marks',()=>fixture('ﬃ ﬃ',({root})=>{
 const result=new PresentationNode();highlightText(result,'ﬃ ﬃ','f');assert.equal(result.textContent,'ﬃ ﬃ');assert.deepEqual(result.children.filter(n=>n.tagName==='MARK').map(n=>n.textContent),['ﬃ','ﬃ']);
 highlightReading(root,'f');assert.equal(CSS.highlights.get('paia-search').length,2);
}));
test('reading highlight remains bounded and hidden controls remain excluded',()=>fixture('Ａ '.repeat(600),({root,node})=>{
 highlightReading(root,'a');assert.equal(CSS.highlights.get('paia-search').length,500);assert.equal(node.data,'Ａ '.repeat(600));
 node.parentElement.closest=()=>true;assert.equal(firstLexicalRange(root,'a'),null);highlightReading(root,'a');assert.equal(CSS.highlights.get('paia-search').length,0);
}));
