import test from 'node:test';
import assert from 'node:assert/strict';
import {ArchiveNavigator,ArchiveNavigatorState} from '../ui/archive-navigator.js';
import {findInputPage} from '../ui/input-search.js';
import {setup} from './harness/thought-m1.mjs';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';

function pendingNavigator(owner){
 let resolve,initialized=0;
 const root={coverage:{state:'complete'},items:[{providerKey:'chatgpt'}]},groups={coverage:{state:'complete'},items:[]};
 const pending=new Promise(r=>{resolve=r;});
 const nav=Object.assign(Object.create(ArchiveNavigator.prototype),{active:true,host:{hidden:false},serial:0,reader:false,query:'',sourceInitialized:false,sourceScope:null,browseSource:null,state:new ArchiveNavigatorState(),restoreDepth:new Map(),mode:'paia',canInitializeSource:()=>owner.view==='library'&&!owner.documentId&&!owner.query.trim(),onSourceInitialized:()=>{initialized++;},readScope:options=>options.groupKind==='providers'?pending:Promise.resolve(groups),updateSourceOptions(){},reconcileUnknownExpansion(){},setStatus(){},paint(){},schedule(){}});
 return {nav,resolve:()=>resolve(root),initialized:()=>initialized};
}
test('pending initial Source discovery cannot change an admitted Search snapshot before Settings Back',async()=>{
 const {s}=await setup(LibraryDocumentsStore),owner={view:'library',documentId:null,query:''},f=pendingNavigator(owner);
 const discovery=f.nav.refresh();
 owner.query='Synthetic explicit';
 const read=options=>s.searchInputs({...options,providerKey:f.nav.sourceScope});
 const first=await findInputPage({query:owner.query,ranked:true,qualified:true,read});
 assert.equal(first.items.length,1);
 f.resolve();await discovery;
 const restored=await findInputPage({query:owner.query,ranked:true,qualified:true,cursor:first.pageCursor,read});
 assert.deepEqual(restored.items.map(x=>x.id),first.items.map(x=>x.id));
 assert.equal(f.nav.sourceScope,null);assert.equal(f.initialized(),0);
 // Explicit Source changes must still reset the Search owner. Reusing the old
 // snapshot in a different Source remains rejected by the authentic backend.
 await assert.rejects(findInputPage({query:owner.query,ranked:true,qualified:true,cursor:first.pageCursor,read:options=>s.searchInputs({...options,providerKey:'chatgpt'})}),{code:'INVALID_REQUEST'});
 const changed=await findInputPage({query:owner.query,ranked:true,qualified:true,read:options=>s.searchInputs({...options,providerKey:'chatgpt'})});assert.equal(changed.items.length,1);
});
test('neutral Archive still initializes its first Source exactly once',async()=>{
 const f=pendingNavigator({view:'library',documentId:null,query:''});const work=f.nav.refresh();f.resolve();await work;assert.equal(f.nav.sourceScope,'chatgpt');assert.equal(f.initialized(),1);await f.nav.refresh();assert.equal(f.initialized(),1);
});
for(const owner of [{view:'settings',documentId:null,query:''},{view:'library',documentId:'reader',query:''}])test(`pending discovery cannot initialize Source after departure to ${owner.documentId?'Reader':owner.view}`,async()=>{const f=pendingNavigator(owner),work=f.nav.refresh();f.resolve();await work;assert.equal(f.nav.sourceScope,null);assert.equal(f.initialized(),0);});
