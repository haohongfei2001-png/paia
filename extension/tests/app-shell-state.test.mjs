import test from 'node:test';
import assert from 'node:assert/strict';
import {appShellRoute,presentAppShell} from '../ui/app-shell-state.js';

test('one shell route preserves source, Project, Conversation and reading position',()=>{
 const anchor={inputId:'input-7',offset:42,sort:'desc'};
 const projectRef={providerKey:'chatgpt',namespace:'synthetic',projectId:'project-1'};
 const route=appShellRoute({view:'library',documentId:'conversation-2',contextInputId:'input-7',sourcePath:{providerKey:'chatgpt',groupKind:'project',projectRef},searchQuery:'older idea',sort:'desc',anchor},{expanded:['chatgpt-project-1'],scrollTop:300,narrowCollapsed:false});
 assert.deepEqual([route.sourceKey,route.projectRef,route.documentId,route.searchQuery,route.sort,route.anchor],["chatgpt",projectRef,"conversation-2","older idea","desc",anchor]);
 assert.deepEqual(route.navigator.expanded,['chatgpt-project-1']);
});

test('the shell owns primary navigation and the visible content container',()=>{
 const ids=['collection-panel','document-panel','thought-panel','settings-panel','legacy-panel','memory-panel','revisit-panel'];
 const panels=new Map(ids.map(id=>[id,{hidden:true}]));
 const buttons=['library','thoughts','memory','settings'].map(view=>({dataset:{view},disabled:true,attributes:{},setAttribute(name,value){this.attributes[name]=value;}}));
 const root={getElementById:id=>panels.get(id),querySelectorAll:selector=>selector==='[data-view]'?buttons:[]};
 presentAppShell(root,{view:'library',documentId:null},{consented:true});
 assert.deepEqual(ids.filter(id=>!panels.get(id).hidden),['collection-panel']);
 assert.equal(buttons[0].attributes['aria-current'],'page');
 presentAppShell(root,{view:'library',documentId:'conversation-2'},{consented:true});
 assert.deepEqual(ids.filter(id=>!panels.get(id).hidden),['document-panel']);
 presentAppShell(root,{view:'thoughts',documentId:null},{consented:true});
 assert.deepEqual(ids.filter(id=>!panels.get(id).hidden),['thought-panel']);
 assert.equal(buttons[1].attributes['aria-current'],'page');
});
