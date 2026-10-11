import test from 'node:test';
import assert from 'node:assert/strict';
import {DocumentEditor} from '../ui/library.js';

function fixture({original='',saved='',display=saved||original||'独立整理文档'}={}){
 const title={innerText:display},listeners=new Map(),observed={protected:0,changed:0};
 const root={addEventListener(type,fn){listeners.set(type,fn);},querySelector:selector=>selector==='#document-title'?title:null,querySelectorAll:()=>[]};
 class Editor extends DocumentEditor{async restoreRecovery(){return true;}async protectRecovery(){observed.protected++;}}
 const editor=new Editor(root,{library:{blocks:[]},records:[],recoveryEpoch:'SYNTHETIC_title_epoch'},{id:'SYNTHETIC_title_document',userTitle:saved,originalConversationTitle:original,titleRevision:0},()=>{},()=>observed.changed++);
 return {editor,title,observed};
}

const longOriginal='跨语言长标题 Chinese English 👩‍💻 '.repeat(12);
for(const [name,options]of [
 ['long captured title',{original:longOriginal}],
 ['multiline captured title',{original:'SYNTHETIC first line\n原始第二行'}],
 ['ordinary captured title',{original:'SYNTHETIC original'}],
 ['untitled fallback',{}],
 ['saved manual title',{original:longOriginal,saved:'SYNTHETIC manual title'}],
])test('untouched '+name+' never creates a title edit, recovery draft or undo entry',async()=>{
 const {editor,observed}=fixture(options);
 try{await editor.recoveryReady;editor.collect();editor.collect();assert.equal(editor.title,options.saved||'');assert.equal(editor.dirty(),false);assert.deepEqual(editor.undoStack,[]);assert.equal(editor.buildEdit(),null);assert.deepEqual(observed,{protected:0,changed:0});assert.equal(await editor.flush(),true);}
 finally{editor.dispose();}
});

for(const [name,entered,expected]of [
 ['explicit long rename','SYNTHETIC renamed '.repeat(25),'SYNTHETIC renamed '.repeat(25).slice(0,300)],
 ['explicit multiline rename','SYNTHETIC changed\n标题','SYNTHETIC changed标题'],
 ['explicit original prefix',longOriginal.slice(0,300),longOriginal.slice(0,300)],
])test(name+' still produces the original bounded manual-title command',async()=>{
 const {editor,title,observed}=fixture({original:longOriginal});
 try{await editor.recoveryReady;title.innerText=entered;editor.collect();assert.equal(editor.title,expected);assert.equal(editor.dirty(),true);assert.equal(editor.buildEdit().title,expected);assert.equal(editor.undoStack.length,1);assert.deepEqual(observed,{protected:1,changed:1});}
 finally{editor.dispose();}
});

test('clearing a saved manual title restores the original display without manufacturing a second rename',async()=>{
 const {editor,title}=fixture({original:longOriginal,saved:'SYNTHETIC old manual title'});
 try{await editor.recoveryReady;title.innerText='';editor.collect();assert.equal(editor.title,'');assert.equal(editor.buildEdit().title,'');title.innerText=longOriginal;editor.collect();assert.equal(editor.title,'');assert.equal(editor.undoStack.length,1);}
 finally{editor.dispose();}
});
