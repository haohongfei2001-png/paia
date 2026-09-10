import test from 'node:test';import assert from 'node:assert/strict';import {findInputPage} from '../ui/input-search.js';
test('empty intermediate search pages automatically advance to a later historical match',async()=>{
 const cursors=[],progress=[];const result=await findInputPage({query:'historical match',read:async q=>{cursors.push(q.cursor);return q.cursor===400?{items:[{id:'late'}],nextCursor:null}:{items:[],nextCursor:(q.cursor||0)+200};},onProgress:()=>progress.push(true)});
 assert.equal(result.items[0].id,'late');assert.deepEqual(cursors,[null,200,400]);assert.equal(progress.length,2);
});
test('new query prevents an old empty page from continuing or replacing the UI',async()=>{
 let current=true,calls=0;const result=await findInputPage({query:'old query',read:async()=>{calls++;current=false;return {items:[],nextCursor:200};},isCurrent:()=>current});assert.equal(result,null);assert.equal(calls,1);
});
test('bounded search retains an explicit next cursor and rejects a nonadvancing loop',async()=>{
 const p={items:[{id:'first'}],nextCursor:200};assert.deepEqual(await findInputPage({query:'x',read:async()=>p}),p);
 await assert.rejects(findInputPage({query:'x',cursor:200,read:async()=>({items:[],nextCursor:200})}));
});
