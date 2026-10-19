import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import * as scope from '../core/context-topic-scope.js';
async function fixture(fn){const {s}=await setup(OrganizerStore);await s.finishFoundation();const abort=new AbortController(),budget=scope.createContextScopeWorkBudget({database:s.repository.db,signal:abort.signal});return s.repository.transaction(false,t=>fn({s,t,abort,budget,reader:scope.contextScopeTransactionReader(s,t,budget)}));}
test('only an actual original bounded adapter proves its live scope and keeps every read on the same ledger',async()=>fixture(async f=>{
 const before=f.budget.reads;assert.equal(scope.assertContextScopeTransactionOrigin(f.reader,f.s.repository,f.budget),true);assert.equal(f.budget.reads,before);await f.reader.get('meta','gate');assert.equal(f.budget.reads,before+1);assert.equal(scope.assertContextScopeTransactionOrigin(f.reader,f.s.repository),true);
}));
for(const kind of ['copied adapter','inherited wrapper','raw transaction','foreign repository','wrong ledger'])test('transaction origin refuses '+kind,async()=>fixture(async f=>{
 let reader=f.reader,repository=f.s.repository,budget=f.budget;
 if(kind==='copied adapter')reader={...reader};if(kind==='inherited wrapper')reader=Object.create(reader);if(kind==='raw transaction')reader=f.t;if(kind==='foreign repository')repository={...repository};if(kind==='wrong ledger')budget=scope.createContextScopeWorkBudget({database:f.s.repository.db,signal:f.abort.signal});
 assert.throws(()=>scope.assertContextScopeTransactionOrigin(reader,repository,budget));
}));
for(const kind of ['database','get method','prototype','tx accessor','ledger signal','budget limit'])test('transaction origin rejects changed '+kind+' without reading a supplied tx getter',async()=>fixture(async f=>{
 const database=f.s.repository.db;let touches=0;
 if(kind==='database')f.s.repository.db={};if(kind==='get method')f.reader.get=async()=>({});if(kind==='prototype')Object.setPrototypeOf(f.reader,{});if(kind==='tx accessor')Object.defineProperty(f.reader,'tx',{get(){touches++;return f.t.tx;}});if(kind==='ledger signal')f.budget.signal=new AbortController().signal;if(kind==='budget limit')f.budget.reads=scope.CONTEXT_TOPIC_SCOPE_LIMITS.reads+1;
 try{assert.throws(()=>scope.assertContextScopeTransactionOrigin(f.reader,f.s.repository));assert.equal(touches,0);}finally{f.s.repository.db=database;}
}));
test('original native abort and fork-parent abort deny an otherwise intact adapter without evaluating a shadow getter',async()=>fixture(async f=>{
 const fork=scope.forkContextScopeWorkBudget(f.budget,{signal:new AbortController().signal}),reader=scope.contextScopeTransactionReader(f.s,f.t,fork);let touches=0;Object.defineProperty(f.abort.signal,'aborted',{get(){touches++;return false;}});f.abort.abort();assert.throws(()=>scope.assertContextScopeTransactionOrigin(reader,f.s.repository));assert.equal(touches,0);
}));
test('original currentness callback revocation and its later signal mutation are checked before returning origin proof',async()=>fixture(async f=>{
 let current=true;const budget=scope.createContextScopeWorkBudget({database:f.s.repository.db,signal:f.abort.signal,isCurrent:()=>{if(!current)f.abort.abort();return current;}}),reader=scope.contextScopeTransactionReader(f.s,f.t,budget);current=false;assert.throws(()=>scope.assertContextScopeTransactionOrigin(reader,f.s.repository));
}));
test('a genuine original adapter cannot outlive its original Repository transaction',async()=>{
 let held;await fixture(f=>{held=f;assert.equal(scope.assertContextScopeTransactionOrigin(f.reader,f.s.repository),true);});assert.throws(()=>scope.assertContextScopeTransactionOrigin(held.reader,held.s.repository));
});
test('a second actual adapter may retain only its exact original branded parent and shared ledger',async()=>fixture(async f=>{
 const fork=scope.forkContextScopeWorkBudget(f.budget),nested=scope.contextScopeTransactionReader(f.s,f.reader,fork);assert.equal(scope.assertContextScopeTransactionOrigin(nested,f.s.repository,fork),true);f.reader.get=async()=>({});assert.throws(()=>scope.assertContextScopeTransactionOrigin(nested,f.s.repository));
}));
test('an independently budgeted nested original adapter checks the older parent currentness too',async()=>{
 const result=await fixture(async f=>{
  let parentCurrent=true,parentChecks=0;const parentBudget=scope.createContextScopeWorkBudget({database:f.s.repository.db,signal:f.abort.signal,isCurrent:()=>{parentChecks++;return parentCurrent;}}),parent=scope.contextScopeTransactionReader(f.s,f.t,parentBudget),independent=scope.createContextScopeWorkBudget({database:f.s.repository.db,signal:new AbortController().signal,isCurrent:()=>true}),nested=scope.contextScopeTransactionReader(f.s,parent,independent);
  const before=scope.assertContextScopeTransactionOrigin(nested,f.s.repository,independent);parentCurrent=false;const count=parentChecks;let accepted=false;try{accepted=scope.assertContextScopeTransactionOrigin(nested,f.s.repository,independent);}catch{}return {before,accepted,checks:parentChecks-count};
 });assert.equal(result.before,true);assert.equal(result.accepted,false);assert.equal(result.checks,1);
});
test('adapter origin checks shared fork-parent currentness once before the complete facts tail',async()=>fixture(async f=>{
 let checks=0;const parentBudget=scope.createContextScopeWorkBudget({database:f.s.repository.db,signal:f.abort.signal,isCurrent:()=>{checks++;return true;}}),parent=scope.contextScopeTransactionReader(f.s,f.t,parentBudget),fork=scope.forkContextScopeWorkBudget(parentBudget),nested=scope.contextScopeTransactionReader(f.s,parent,fork),before=checks;
 assert.equal(scope.assertContextScopeTransactionOrigin(nested,f.s.repository),true);assert.equal(checks,before+1);
}));
test('a later independent adapter callback cannot hide revocation of an earlier parent signal',async()=>{
 const accepted=await fixture(async f=>{
  const parentBudget=scope.createContextScopeWorkBudget({database:f.s.repository.db,signal:f.abort.signal,isCurrent:()=>true}),parent=scope.contextScopeTransactionReader(f.s,f.t,parentBudget);let revoke=false;const independent=scope.createContextScopeWorkBudget({database:f.s.repository.db,signal:new AbortController().signal,isCurrent:()=>{if(revoke)f.abort.abort();return true;}}),nested=scope.contextScopeTransactionReader(f.s,parent,independent);revoke=true;
  try{return scope.assertContextScopeTransactionOrigin(nested,f.s.repository);}catch{return false;}
 });assert.equal(accepted,false);
});
