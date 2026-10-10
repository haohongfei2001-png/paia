import test from 'node:test';
import assert from 'node:assert/strict';
import {assertManualContextCurrentPhysicalShape as shape} from '../core/browser-native-sync/manual-context-current-shape.js';
import {emptyContextCards,validContextCards,CONTEXT_LIMITS} from '../core/context-cards.js';
import {validateEntity} from '../core/browser-native-sync/codecs.js';

const id='00000000-0000-0000-0000-000000000001';
const item=(card='info')=>({id,card,body:'SYNTHETIC 中文\n保留条件：不要外发。',section:'SYNTHETIC section',revision:1,order:0,origin:'manual',protected:true,userEdited:true,lifecycle:'active',createdAt:'2026-10-10T00:00:00.000Z',updatedAt:'2026-10-10T00:00:00.000Z',deletedBy:null});
const row=()=>({...emptyContextCards(),sequence:1,items:[item()]});
const refuses=value=>assert.throws(()=>shape(value),{code:'BNS_GROUP_CANONICAL_UNREPRESENTED'});
const owners=value=>[value,value.access,value.access.info,value.items,value.items[0]];

test('manual physical text is immutable and remains subject to each original codec',()=>{
 for(const [card,type]of [['info','contextItem'],['rules','contextRulesItem'],['now','contextNowItem']]){
  const value=row();value.items[0].card=card;const before=structuredClone(value);
  assert.equal(shape(value),true);assert.equal(validContextCards(value),true);assert.deepEqual(validateEntity(type,value.items[0]),value.items[0]);assert.deepEqual(value,before);
 }
});
test('empty original row and portable desired bits keep global effective permission off',()=>{
 const value=emptyContextCards();for(const key of ['info','rules','now','inputs'])value.access[key]={enabled:true,revision:3};
 value.access.global.revision=7;const before=structuredClone(value);assert.equal(shape(value),true);assert.deepEqual(value,before);
 const effective=structuredClone(value);effective.access.global.enabled=true;refuses(effective);
});
test('physical admission alone does not replace original body and duplicate identity validation',()=>{
 const invalid=row();invalid.items[0].body='SYNTHETIC\u0000';assert.equal(shape(invalid),true);assert.equal(validContextCards(invalid),false);assert.throws(()=>validateEntity('contextItem',invalid.items[0]));
 const duplicate=row();duplicate.items.push(structuredClone(duplicate.items[0]));assert.equal(shape(duplicate),true);assert.equal(validContextCards(duplicate),false);
});
test('physical removed intent remains exact, without inventing a causal chain proof',()=>{
 const value=row();value.items[0].lifecycle='removed';value.items[0].revision=2;value.items[0].deletedBy='00000000-0000-0000-0000-000000000002';
 const before=structuredClone(value);assert.equal(shape(value),true);assert.equal(validContextCards(value),true);assert.deepEqual(value,before);
});
test('missing own fields and inherited item body refuse without getter execution',()=>{
 let reads=0;const missing=row();delete missing.items[0].body;refuses(missing);
 Object.setPrototypeOf(missing.items[0],{get body(){reads++;return 'unpaid';}});refuses(missing);assert.equal(reads,0);
});
test('selected root, access, item and dense-array accessors refuse without reading',()=>{
 let reads=0;for(const [position,key]of [[0,'items'],[1,'info'],[2,'enabled'],[3,'0'],[4,'body']]){
  const value=row();Object.defineProperty(owners(value)[position],key,{enumerable:true,get(){reads++;throw Error('unpaid');}});refuses(value);
 }assert.equal(reads,0);
});
test('nonenumerable selected fields and hidden additional fields refuse',()=>{
 for(const [position,key]of [[0,'sequence'],[1,'info'],[2,'enabled'],[4,'body']]){
  const value=row(),owner=owners(value)[position];Object.defineProperty(owner,key,{value:owner[key],enumerable:false});refuses(value);
 }
 for(const position of [0,1,2,4]){const value=row();Object.defineProperty(owners(value)[position],'hidden',{value:'SYNTHETIC'});refuses(value);}
});
test('caller serialization on every selected owner refuses without execution',()=>{
 let calls=0;for(let position=0;position<5;position++){
  const value=row();Object.defineProperty(owners(value)[position],'toJSON',{value(){calls++;throw Error('unpaid');}});refuses(value);
 }Object.defineProperty(Object.prototype,'toJSON',{configurable:true,get(){calls++;throw Error('unpaid');}});
 try{refuses(row());}finally{delete Object.prototype.toJSON;}assert.equal(calls,0);
});
test('descriptor value pollution refuses before accessor evaluation',()=>{
 let calls=0;const value=row();Object.defineProperty(value.items[0],'body',{enumerable:true,get(){calls++;throw Error('unpaid');}});
 Object.defineProperty(Object.prototype,'value',{configurable:true,value:'unpaid'});try{refuses(value);}finally{delete Object.prototype.value;}assert.equal(calls,0);
});
test('custom owner prototypes, symbols and array holes refuse',()=>{
 for(let position=0;position<5;position++){
  const value=row();Object.setPrototypeOf(owners(value)[position],Object.create(position===3?Array.prototype:Object.prototype));refuses(value);
  const symbolic=row();owners(symbolic)[position][Symbol('SYNTHETIC')]=true;refuses(symbolic);
 }
 const hole=row();delete hole.items[0];refuses(hole);
});
test('hidden array methods refuse without invocation',()=>{
 let calls=0;for(const method of ['map','filter','every']){const value=row();Object.defineProperty(value.items,method,{value(){calls++;throw Error('unpaid');}});refuses(value);}assert.equal(calls,0);
});
test('automatic and edited automatic items are not converted into manual intent',()=>{
 for(const protectedValue of [false,true]){const value=row();value.items[0].origin='automatic';value.items[0].protected=protectedValue;value.items[0].userEdited=protectedValue;refuses(value);assert.equal(value.items[0].origin,'automatic');}
 const maintenance=row();maintenance.items[0].maintenance={};refuses(maintenance);
 const inputs=row();inputs.items[0].card='inputs';refuses(inputs);
});
test('original finite item and field bounds remain enforced before domain work',()=>{
 const value=emptyContextCards();value.sequence=CONTEXT_LIMITS.items;value.items=Array.from({length:CONTEXT_LIMITS.items},(_,index)=>({...item(),id:'00000000-0000-0000-0000-'+String(index+1).padStart(12,'0'),order:index}));assert.equal(shape(value),true);assert.equal(validContextCards(value),true);
 value.items.push({...item(),id:'00000000-0000-0000-0000-000000000999'});refuses(value);
 for(const [key,tooLong]of [['body',CONTEXT_LIMITS.body+1],['section',81]]){const oversized=row();oversized.items[0][key]='x'.repeat(tooLong);refuses(oversized);}
});
test('invalid scalar fields and local effective access refuse without rewriting',()=>{
 for(const mutate of [v=>v.sequence=-1,v=>v.access.info.revision=1.5,v=>v.access.info.enabled=1,v=>v.items[0].revision=0,v=>v.items[0].order=-1,v=>v.items[0].id='SYNTHETIC',v=>v.items[0].protected=false,v=>v.items[0].userEdited=false,v=>v.items[0].lifecycle='purged']){
  const value=row();mutate(value);const before=structuredClone(value);refuses(value);assert.deepEqual(value,before);
 }
});
