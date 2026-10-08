import test from 'node:test';
import assert from 'node:assert/strict';
import {LibraryEntryEditor} from '../ui/library-entry-editor.js';
function fixture(id){
 const listeners=new Map(),root={addEventListener(type,fn){listeners.set(type,fn);},querySelectorAll(){return [];}};
 const editor=new LibraryEntryEditor(root,[],()=>{});editor.entries.set(id,{saved:{body:'saved',note:'',type:'idea'},local:{body:'saved',note:'',type:'idea'}});
 return {editor,start(){listeners.get('compositionstart')({target:{closest:()=>({dataset:{entryId:id}})}});},end(){listeners.get('compositionend')();}};
}
test('Entry composition end releases only the completed composition pin',()=>{
 const a=fixture('a'),b=fixture('b');try{a.start();b.start();assert.deepEqual([...a.editor.protectedIds()],['a']);assert.deepEqual([...b.editor.protectedIds()],['b']);a.end();assert.equal(a.editor.surface.composing,false);assert.equal(a.editor.composingId,null);assert.deepEqual([...a.editor.protectedIds()],[]);assert.deepEqual([...b.editor.protectedIds()],['b']);}finally{a.editor.dispose();b.editor.dispose();}
});
test('Entry composition end retains dirty and pending recovery protections',()=>{
 const f=fixture('dirty');try{f.start();f.editor.entries.get('dirty').local.body='unsaved';f.editor.recoveries.set('pending',{pending:true});f.end();assert.equal(f.editor.composingId,null);assert.deepEqual(new Set(f.editor.protectedIds()),new Set(['dirty','pending']));}finally{f.editor.dispose();}
});
test('Canceled composition repaints the original identity and clears its pin',()=>{
 const f=fixture('canceled');try{let painted;f.editor.paint=id=>painted=id;f.start();f.editor.compositionCanceled=true;f.end();assert.equal(painted,'canceled');assert.equal(f.editor.compositionCanceled,false);assert.equal(f.editor.composingId,null);assert.deepEqual([...f.editor.protectedIds()],[]);}finally{f.editor.dispose();}
});
