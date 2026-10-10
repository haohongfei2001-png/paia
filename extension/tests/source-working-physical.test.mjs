import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSourceRecord,initialSourceObjects} from '../core/source-initial.js';
import {recordIndex,blockIndex,sourceCount} from '../core/idb-repository.js';
import {bytes} from '../core/browser-native-sync/value.js';
import {branchRawMeasure} from '../core/browser-native-sync/human-library-plan.js';
import {measureSourceWorkingPhysicalTree as measure,equalSourceWorkingPhysicalTree as equal} from '../core/browser-native-sync/source-working-physical.js';
function originalRows(){
 const record=initialSourceRecord({id:'synthetic-source-physical',chat:{id:'synthetic-chat-physical',url:'https://chatgpt.com/c/synthetic-chat-physical',title:'Synthetic'},message:{sourceMessageId:'synthetic-message-physical',pageOrder:0,originalText:'SYNTHETIC 原文🙂'},identity:{sourceKey:'synthetic-source-key',dedupeKey:'synthetic-dedupe-key',contentHash:'synthetic-content-hash'},at:'2026-10-10T00:00:00.000Z'});
 const {document,block}=initialSourceObjects(record);
 return {recordIndex:recordIndex(record,0),blockIndex:blockIndex(block,0,[record]),sourceCount:sourceCount(document.id,record.sourceKey,[record],[block],record.chatId),document:{id:document.id,chatKey:'chatgpt:'+record.chatId,sequence:0,displayKey:[-(Date.parse(document.lastSourceSentAt)||0),document.id],value:document}};
}
test('actual original Source index owners retain own undefined and document signed zero across structured clone',()=>{
 const rows=originalRows(),clone=structuredClone(rows);assert.ok(Object.hasOwn(rows.recordIndex,'legacyChat'));assert.equal(rows.recordIndex.legacyChat,undefined);assert.ok(Object.is(rows.document.displayKey[0],-0));
 const m=measure(rows);assert.ok(m.B>0&&m.T>0&&m.V>0&&m.E>0);assert.equal(equal(rows,clone),true);
 assert.throws(()=>bytes(rows),{code:'BNS_VALUE_INVALID'});assert.throws(()=>branchRawMeasure(rows),{code:'BNS_VALUE_INVALID'},'original wire/native Human rules remain strict');
});
test('physical equality refuses missing own undefined, signed-zero coercion, extra attributes and stale derived owner values',()=>{
 const rows=originalRows();for(const change of [x=>delete x.recordIndex.legacyChat,x=>x.document.displayKey[0]=0,x=>x.blockIndex.recordIds.push('synthetic-extra-source'),x=>x.sourceCount.views.push('synthetic-extra-view'),x=>x.document.value.title='SYNTHETIC unjournaled title',x=>x.recordIndex.extra=undefined]){const changed=structuredClone(rows);change(changed);measure(changed);assert.equal(equal(rows,changed),false);}
});
test('descriptor reads do not execute supplied getters and reject sparse or hidden array content',()=>{
 let calls=0;const row={};Object.defineProperty(row,'body',{enumerable:true,get(){calls++;return 'private';}});assert.throws(()=>measure(row),{code:'BNS_SOURCE_WORKING_PHYSICAL_INVALID'});assert.throws(()=>equal(row,{body:'private'}),{code:'BNS_SOURCE_WORKING_PHYSICAL_INVALID'});assert.equal(calls,0);
 for(const value of [[,1],Object.defineProperty([1],'hidden',{value:'SYNTHETIC'}),Object.defineProperty({},'hidden',{value:'SYNTHETIC'})])assert.throws(()=>measure(value),{code:'BNS_SOURCE_WORKING_PHYSICAL_INVALID'});
});
test('physical admission refuses custom prototypes, symbols, nonfinite and callable values',()=>{
 const symbol={safe:true};symbol[Symbol('SYNTHETIC')]=true;
 for(const value of [Object.create({inherited:'SYNTHETIC'}),symbol,{value:NaN},{value:Infinity},{value:()=>true},new Date(),new Map()])assert.throws(()=>measure(value),{code:'BNS_SOURCE_WORKING_PHYSICAL_INVALID'});
});
test('finite physical meter rejects oversize, excess keys/array extent, deep cycles and invalid Unicode before encoding a body',()=>{
 assert.throws(()=>measure({body:'SYNTHETIC'.repeat(100)},32),{code:'BNS_HUMAN_GRAPH_LIMIT'});
 assert.throws(()=>measure(Object.fromEntries(Array.from({length:129},(_,i)=>['x'+i,i]))),{code:'BNS_HUMAN_GRAPH_LIMIT'});
 assert.throws(()=>measure(Array(4097).fill(0)),{code:'BNS_SOURCE_WORKING_PHYSICAL_INVALID'});
 const cyclic={};cyclic.self=cyclic;assert.throws(()=>measure(cyclic),{code:'BNS_HUMAN_GRAPH_LIMIT'});
 assert.throws(()=>measure({body:'\ud800'}),{code:'BNS_TEXT_ENCODING'});
});
