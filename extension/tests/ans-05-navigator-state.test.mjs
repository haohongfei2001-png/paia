import test from 'node:test';
import assert from 'node:assert/strict';
import {ArchiveNavigatorState,navigatorGroupKey,navigatorScopeKey,navigatorInvalidationMessage} from '../ui/archive-navigator.js';

test('ANS-05 Navigator session state keeps unknown/unassigned distinct and deep-link expands only its parent',()=>{
 const state=new ArchiveNavigatorState(),project={providerKey:'chatgpt',namespace:'fixture',projectId:'p1'};
 assert.notEqual(navigatorGroupKey('chatgpt','unknown'),navigatorGroupKey('chatgpt','unassigned'));
 assert.notEqual(navigatorScopeKey({providerKey:'chatgpt',groupKind:'unknown'}),navigatorScopeKey({providerKey:'chatgpt',groupKind:'unassigned'}));
 assert.equal(state.expanded.size,0,'Project groups start collapsed');
 state.select({documentId:'doc-a',available:true,providerKey:'chatgpt',groupKind:'project',projectRef:project,sourceStatus:'observed_active',parentSourceStatus:'observed_active'});
 assert.deepEqual([...state.expanded],[navigatorGroupKey('chatgpt','project',project)],'deep-link expands only the selected parent');
 state.toggle({providerKey:'chatgpt',groupKind:'unknown',projectRef:null});
 assert.equal(state.expanded.has(navigatorGroupKey('chatgpt','unknown')),true);
 state.toggle({providerKey:'chatgpt',groupKind:'unknown',projectRef:null});
 assert.equal(state.expanded.has(navigatorGroupKey('chatgpt','unknown')),false);
});

test('ANS-05 Navigator scopes and snapshot are session-only bounded UI state',()=>{
 const state=new ArchiveNavigatorState(),a=state.scope({groupKind:'providers'}),b=state.scope({providerKey:'chatgpt',groupKind:'groups'});
 assert.notEqual(a,b);assert.equal(state.scope({groupKind:'providers'}),a);
 state.expanded.add(navigatorGroupKey('chatgpt','project',{providerKey:'chatgpt',namespace:'fixture',projectId:'p'}));
 state.scrollTop=312;
 const snapshot=state.snapshot();
 assert.equal(snapshot.scrollTop,312);assert.equal(snapshot.expanded.length,1);
 assert.equal(JSON.stringify(snapshot).includes('originalText'),false);
 state.resetScopes();assert.equal(state.scopes.size,0);assert.equal(state.expanded.size,1,'rebuildable query state resets without losing session expansion');
});


test('CPR-02 Navigator invalidation reacts to source-structure changes without treating unrelated messages as archive mutations',()=>{
 assert.equal(navigatorInvalidationMessage({type:'SOURCE_STRUCTURE_CHANGED'}),true);
 assert.equal(navigatorInvalidationMessage({type:'ARCHIVE_CHANGED',cause:'CAPTURE'}),true);
 assert.equal(navigatorInvalidationMessage({type:'ARCHIVE_CHANGED'}),false);
 assert.equal(navigatorInvalidationMessage({type:'PAIA_READER_POLICY_CHANGED'}),false);
 assert.equal(navigatorInvalidationMessage(null),false);
});
