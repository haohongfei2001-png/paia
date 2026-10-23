import {readFileSync,writeFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
import {nativeTopicActivityFixture,nativeTopicActivitySetup} from '../../extension/tests/native-sync/topic-activity-fixture.mjs';
const original=readFileSync('extension/tests/topic-activity-sync.test.mjs','utf8'),helper=readFileSync('extension/tests/harness/thought-m1.mjs','utf8'),generated=nativeTopicActivityFixture(original),setup=nativeTopicActivitySetup(helper);
const plain=s=>s.replace(/^import[^;\n]+;/gm,'').replace(/^export /gm,'');
const sourceCases=[];runInNewContext(plain(original),{test:(name,fn)=>sourceCases.push({name,body:fn.toString()}),globalThis:{}});
const nativeCases=runInNewContext(plain(generated)+'\ncases.map(({name,fn})=>({name,body:fn.toString()}));',{globalThis:{__bnsNative:{run(){}}},originalAssert:{}});
assert.equal(sourceCases.length,34);assert.equal(nativeCases.length,34);
for(let i=0;i<34;i++){assert.equal(sourceCases[i].name,nativeCases[i].name);assert.equal(sourceCases[i].body.replaceAll('new OrganizerStore(storage,{indexedDB})','nativeActivityStore(storage,{indexedDB})'),nativeCases[i].body);}
const identity=runInNewContext(plain(setup)+`\n(()=>{const a={},b={},factory=globalThis.indexedDB;return [nativeActivityOptions(a,{indexedDB:factory}).name===nativeActivityOptions(a,{indexedDB:factory}).name,nativeActivityOptions(a,{indexedDB:factory}).name!==nativeActivityOptions(b,{indexedDB:factory}).name];})();`,{globalThis:{indexedDB:{}},crypto:{randomUUID:()=>Math.random().toString()}});
assert.deepEqual(Array.from(identity),[true,true]);
assert.throws(()=>nativeTopicActivityFixture(original.replace("import {IDBFactory} from './vendor/fake-indexeddb/build/esm/index.js';",'')));
assert.throws(()=>nativeTopicActivitySetup(helper.replace('new IDBFactory()','otherFactory')));
writeFileSync('work/active-generation-library-20261023/native-preparation/topic-activity.mjs',generated);writeFileSync('work/active-generation-library-20261023/native-preparation/topic-activity-setup.mjs',setup);writeFileSync('work/active-generation-library-20261023/native-preparation/activity-controls.json',JSON.stringify({cases:34,adaptedBodiesExact:true,coldSameStorage:true,freshDistinctStorage:true,refusalControls:2},null,2));console.log('34 exact bodies; native factory identity and refusal controls passed');
