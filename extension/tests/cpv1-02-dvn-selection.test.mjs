import test from 'node:test';
import assert from 'node:assert/strict';
import {selectionMatchesBody,readerToolbarPosition,sameReaderSelection} from '../ui/reader-selection.js';
import {readFile} from 'node:fs/promises';
test('D1 selected Input retains exact Unicode range and refuses changed body before/after flush',()=>{
 const body='原文 👩‍💻 é 不确定。',text='👩‍💻 é',start=body.indexOf(text),selection={text,input:{id:'synthetic-input',body,span:{start,end:start+text.length}}};
 assert.equal(selectionMatchesBody(selection,body),true);
 assert.equal(selectionMatchesBody(selection,'改写 '+body),false);
 assert.equal(selectionMatchesBody(selection,body+' 新内容'),false,'even a nonselected external change requires explicit reselection');
 assert.equal(selectionMatchesBody({...selection,text:'wrong'},body),false);
 assert.equal(selectionMatchesBody({text,input:null},body),false,'cross Input selection cannot produce one source ref');
 assert.equal(selectionMatchesBody(null,body),false);
});
test('D1 one shell explicitly composes existing owners; retired observer bootstraps are absent',async()=>{
 const read=name=>readFile(new URL('../ui/'+name,import.meta.url),'utf8');
 const [archive,shell,nav,html]=await Promise.all(['archive.js','app-shell.js','archive-navigator.js','archive.html'].map(read));
 assert.equal((archive.match(/new AppShellController/g)||[]).length,1);
 assert.equal((archive.match(/appShell\.mount\(\)/g)||[]).length,1);
 assert.doesNotMatch(archive,/import.*(?:core-loop|ux-r1-shell-coordinator|archive-shell-chrome)/);
 assert.doesNotMatch(shell,/MutationObserver|setInterval|localStorage|indexedDB/);
 assert.doesNotMatch(nav,/MutationObserver/);
 assert.match(html,/id="archive-root-navigator-slot"/);assert.match(html,/id="archive-reader-navigator-slot"/);
 assert.match(archive,/owner!==editor/,'async selection cannot act on a replacement editor');
 assert.equal((archive.match(/selectionMatchesBody\(selection,owner\.text\(/g)||[]).length,2,'selection validated before and after save');
});

test('D1 frozen token aliases are not redefined by retained feature styles',async()=>{
 for(const name of ['archive.css','experience.css']){const css=await readFile(new URL('../ui/'+name,import.meta.url),'utf8');assert.doesNotMatch(css,/--paia-(?:ink|muted|line|surface|focus|accent):/,'one theme owner for '+name);}
});

test('D1 shared shell preserves saved prose size precedence in unmigrated AI fields',async()=>{
 const css=await readFile(new URL('../ui/app-shell.css',import.meta.url),'utf8');
 assert.match(css,/\.entry-prose,\.thought-prose\{font-size:var\(--paia-prose-size\)!important/);
});

test('D1 selection toolbar is adjacent and clamped across narrow/zoomed viewport edges',()=>{
 const size={width:288,height:88},viewport={width:320,height:720,left:0,top:0};
 assert.deepEqual(readerToolbarPosition({left:10,right:80,top:100,bottom:125},size,viewport),{left:16,top:133});
 assert.deepEqual(readerToolbarPosition({left:280,right:318,top:650,bottom:675},size,viewport),{left:16,top:554});
 const zoom={left:100,top:150,width:320,height:360},result=readerToolbarPosition({left:350,right:400,top:160,bottom:200},size,zoom);
 assert.equal(result.left,116);assert.equal(result.top,208);
 const edge=readerToolbarPosition({left:0,right:100,top:0,bottom:1000},size,viewport);assert.equal(edge.top,616);
 assert.equal(sameReaderSelection(null,null),false);const node={},a={text:'原文',range:{startContainer:node,endContainer:node,startOffset:0,endOffset:2}};
 assert.equal(sameReaderSelection(a,{...a,range:{...a.range}}),true);assert.equal(sameReaderSelection(a,{...a,text:'变化'}),false);
});
