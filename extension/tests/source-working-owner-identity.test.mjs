import test from 'node:test';
import assert from 'node:assert/strict';
import {SourceBootstrapJournal,assertOriginalSourceBootstrapOwner as sourceOwner} from '../core/browser-native-sync/source-bootstrap-journal.js';
import {FilterIntentSyncJournal,assertOriginalFilterIntentOwner as filterOwner} from '../core/browser-native-sync/filter-intent-journal.js';
import {InputWorkingSyncJournal,assertOriginalInputWorkingOwner as workingOwner} from '../core/browser-native-sync/input-working-journal.js';
function owners(){const core={},filter=new FilterIntentSyncJournal(core),source=new SourceBootstrapJournal(core),working=new InputWorkingSyncJournal(core,{filterJournal:filter,logicalCommits:true});return {core,filter,source,working};}
const entries=x=>[[x.source,sourceOwner],[x.filter,filterOwner],[x.working,workingOwner]];
test('genuine original Source, filter and logical Working constructors bind exactly their original Core and private state',()=>{
 const x=owners();for(const [journal,guard]of entries(x)){guard(journal,x.core);assert.throws(()=>guard(journal,{}),{code:'BNS_SOURCE_WORKING_OWNER_REQUIRED'});assert.throws(()=>guard(journal,x.core,true),{code:'BNS_SOURCE_WORKING_OWNER_REQUIRED'});}assert.equal(x.working.logicalCommits,true);
});
test('prototype instances and cloned public fields cannot mint original owner identity',()=>{
 const x=owners();for(const [journal,guard]of entries(x)){const fake=Object.assign(Object.create(Object.getPrototypeOf(journal)),journal);assert.throws(()=>guard(fake,x.core),{code:'BNS_SOURCE_WORKING_OWNER_REQUIRED'});assert.throws(()=>guard({...journal},x.core),{code:'BNS_SOURCE_WORKING_OWNER_REQUIRED'});}
});
test('genuine owner refuses changed binding/prepared state and accessor replacement without calling supplied getter',()=>{
 const x=owners();for(const [journal,guard]of entries(x)){for(const name of Object.keys(journal)){const d=Object.getOwnPropertyDescriptor(journal,name);journal[name]=typeof d.value==='boolean'?!d.value:{};assert.throws(()=>guard(journal,x.core),{code:'BNS_SOURCE_WORKING_OWNER_REQUIRED'});Object.defineProperty(journal,name,d);guard(journal,x.core);}
 let reads=0;const d=Object.getOwnPropertyDescriptor(journal,'core');Object.defineProperty(journal,'core',{configurable:true,get(){reads++;return x.core;}});try{assert.throws(()=>guard(journal,x.core),{code:'BNS_SOURCE_WORKING_OWNER_REQUIRED'});assert.equal(reads,0);}finally{Object.defineProperty(journal,'core',d);}}
});
test('selected owner methods remain original across instance and prototype replacement',()=>{
 const x=owners();for(const [journal,guard,method]of [[x.source,sourceOwner,'capture'],[x.filter,filterOwner,'prepareWorking'],[x.working,workingOwner,'prepareEdit']]){
 let calls=0;Object.defineProperty(journal,method,{configurable:true,get(){calls++;return ()=>true;}});try{assert.throws(()=>guard(journal,x.core),{code:'BNS_SOURCE_WORKING_OWNER_REQUIRED'});assert.equal(calls,0);}finally{delete journal[method];}
 const p=Object.getPrototypeOf(journal),d=Object.getOwnPropertyDescriptor(p,method);Object.defineProperty(p,method,{...d,value:()=>true});try{assert.throws(()=>guard(journal,x.core),{code:'BNS_SOURCE_WORKING_OWNER_REQUIRED'});}finally{Object.defineProperty(p,method,d);}guard(journal,x.core);
 }
});
