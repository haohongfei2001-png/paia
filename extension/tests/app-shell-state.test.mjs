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

test('Thought header slots stay consent- and route-owned even when a late page read unhides its inner controls',()=>{
 const names=['thought-root-header','thought-root-source','thought-topic-header'],panels=new Map(names.map(id=>[id,{hidden:true}])),root={getElementById:id=>panels.get(id),querySelectorAll:()=>[]};
 for(const [route,consented,shown]of [[{view:'thoughts'},true,['thought-root-header','thought-root-source']],[{view:'thoughts',topicId:'topic'},true,['thought-topic-header']],[{view:'thoughts'},false,null],[{view:'thoughts',topicId:'topic'},false,null],[{view:'library'},true,null],[{view:'memory'},true,null],[{view:'settings'},true,null]]){
  presentAppShell(root,route,{consented});assert.deepEqual(names.filter(id=>!panels.get(id).hidden),shown||[]);
 }
});
