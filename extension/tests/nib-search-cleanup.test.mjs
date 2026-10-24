import test from 'node:test';
import assert from 'node:assert/strict';
import {finishNIBSearch} from './harness/nib-search-cleanup.mjs';
import {readFile} from 'node:fs/promises';

for (const primaryPresent of [false,true]) test('NIB Search page close refusal still closes every owner; primary='+primaryPresent, async t => {
 const primary=primaryPresent?Error('original query failure'):null,closed=[],logs=[];
 const errors=['capture','diagnostic','harness','copy'].map(name=>Error(name+' refused'));
 t.mock.method(console,'error',(...args)=>logs.push(args));
 const steps=errors.map((error,index)=>[String(index),async()=>{closed.push(index);throw error;}]);
 await assert.rejects(finishNIBSearch(primary,steps),error=>error===(primary||errors[0]));
 assert.deepEqual(closed,[0,1,2,3]); assert.equal(logs.length,4);
});
test('NIB Search sole final copy cleanup failure is not swallowed',async t=>{
 const error=Error('copy refused'),closed=[];t.mock.method(console,'error',()=>{});
 await assert.rejects(finishNIBSearch(null,[['harness',async()=>closed.push('harness')],['copy',async()=>{closed.push('copy');throw error;}]]),e=>e===error);
 assert.deepEqual(closed,['harness','copy']);
});
test('NIB Search original launch failure wins over copy removal failure',async t=>{
 const primary=Error('launch refused');let attempted=0;t.mock.method(console,'error',()=>{});
 await assert.rejects(finishNIBSearch(primary,[['copy',async()=>{attempted++;throw Error('remove refused');}]]),e=>e===primary);
 assert.equal(attempted,1);
});
test('NIB Search success cleans every resource once',async()=>{
 const closed=[];await finishNIBSearch(null,['capture','diagnostic','harness','copy'].map(name=>[name,async()=>closed.push(name)]));
 assert.deepEqual(closed,['capture','diagnostic','harness','copy']);
});
test('original NIB native fixture wires all cleanup stages inside primary-error boundary',async()=>{
 const source=await readFile(new URL('./nib-v4-search-chrome-e2e.test.mjs',import.meta.url),'utf8');
 const cleanup=source.slice(source.lastIndexOf('}catch(error){primaryError=error;throw error;}finally{'));
 assert.match(cleanup,/finishNIBSearch\(primaryError,/);
 for(const stage of ['capture-page','owner-diagnostic','harness','owner-copy'])assert.ok(cleanup.includes("['"+stage+"'"));
 assert.match(source,/assert.equal\(cases.length,16/);assert.match(source,/timeout:180000/);
});
