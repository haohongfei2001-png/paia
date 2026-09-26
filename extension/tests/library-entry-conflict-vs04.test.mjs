import test from 'node:test';
import assert from 'node:assert/strict';
import {LibraryEntryEditor} from '../ui/library-entry-editor.js';
import {UndoJournal} from '../ui/editor-primitives.js';

const row=(id,body,note,revision=1)=>({
 id,body,note,type:'idea',revision,
 fieldRevisions:{body:revision,note:revision,type:1},
 currentInputRevision:null,lifecycle:'active',staleReasons:[],
});
function editorWith(rows){
 const editor=Object.create(LibraryEntryEditor.prototype);
 editor.surface={composing:false};editor.conflicted=true;editor.failed=true;
 editor.entries=new Map(rows.map(r=>[r.id,{
  saved:{body:r.body,note:r.note,type:r.type},
  local:{body:r.body,note:r.note,type:r.type},
  revision:r.revision,fieldRevisions:r.fieldRevisions,
  currentInputRevision:r.currentInputRevision,sourceRecordIds:[],
 }]));
 editor.journal=new UndoJournal();editor.revisions={last:{signature:'old'}};
 editor.recoveryOps=new Map([['old',{operationId:'old'}]]);
 editor.paint=()=>{};
 return editor;
}

test('VS-04 conflict rebase keeps edited text, adopts untouched fields and renews revision',()=>{
 const editor=editorWith([row('a','saved body','saved note')]);
 const entry=editor.entries.get('a');
 entry.local.body='my unsaved body';
 editor.journal.record([{id:'a',field:'body',before:'saved body',after:'my unsaved body'}]);
 const remote=row('a','other tab body','other tab note',2);
 assert.equal(editor.rebaseConflict([remote]),true);
 assert.deepEqual(entry.local,{body:'my unsaved body',note:'other tab note',type:'idea'});
 assert.deepEqual(entry.saved,{body:'other tab body',note:'other tab note',type:'idea'});
 assert.deepEqual(editor.pendingEntries(),[{
  id:'a',expectedRevision:2,expectedFieldRevisions:remote.fieldRevisions,
  expectedInputRevision:null,changes:{body:'my unsaved body'},
 }]);
 assert.equal(editor.conflicted,false);assert.equal(editor.failed,false);
 assert.equal(editor.journal.undo.length,0);assert.equal(editor.revisions.last,null);
 assert.equal(editor.recoveryOps.size,0);
});

test('VS-04 conflict rebase rejects purged or incomplete rows atomically',()=>{
 const editor=editorWith([row('a','one','note'),row('b','two','note')]);
 editor.entries.get('a').local.body='draft one';
 editor.entries.get('b').local.body='draft two';
 const before=structuredClone([...editor.entries]);
 const unsafe={...row('b','remote two','note',2),staleReasons:['source_purged']};
 assert.equal(editor.rebaseConflict([row('a','remote one','note',2),unsafe]),false);
 assert.deepEqual([...editor.entries],before);
 assert.equal(editor.conflicted,true);
});
