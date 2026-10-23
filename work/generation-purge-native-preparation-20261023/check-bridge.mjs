import {readFileSync,writeFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
import {nativeGenerationPurgeFixture} from '../../extension/tests/native-sync/generation-purge-fixture.mjs';
const helpers=readFileSync('extension/tests/harness/thought-m1.mjs','utf8'),results=[];
function plain(source){let previous;do{previous=source;source=source.replace(/^import[^;\n]+;/gm,'');}while(source!==previous);return source.replace(/^export /gm,'');}
for(const [name,file,count] of [['generation-owner','canonical-generation-owner-restore.test.mjs',30],['source-purge','browser-native-sync-source-purge.test.mjs',28],['saved-multiple','browser-native-sync-saved-multiple.test.mjs',15],['human-generation','canonical-generation-human-restore.test.mjs',32]]){
 const original=readFileSync('extension/tests/'+file,'utf8'),generated=nativeGenerationPurgeFixture(original,helpers,name+'-matrix');
 writeFileSync('work/generation-purge-native-preparation-20261023/'+name+'.mjs',generated);
 const sourceCases=[];runInNewContext(plain(original),{IDBKeyRange:{},test:(name,fn)=>sourceCases.push({name,body:fn.toString()}),globalThis:{}});
 const nativeCases=runInNewContext(plain(generated)+'\ncases.map(({name,fn})=>({name,body:fn.toString()}));',{globalThis:{__bnsNative:{run(){}}}});
 assert.equal(sourceCases.length,count);assert.equal(nativeCases.length,count);
 const adapt=body=>body.replaceAll('new LibraryFoundationStore(','nativeStore(').replaceAll('new LibraryDocumentsStore(','nativeStore(').replaceAll('new ArchiveRepository(','nativeRepository(').replaceAll('new IDBFactory()','indexedDB');
 for(let i=0;i<count;i++){assert.equal(sourceCases[i].name,nativeCases[i].name);assert.equal(adapt(sourceCases[i].body),nativeCases[i].body);}
 assert.throws(()=>nativeGenerationPurgeFixture(original.replace("import test from 'node:test';",''),helpers,name+'-matrix'));
 assert.throws(()=>nativeGenerationPurgeFixture(original+'\nawait import("unexpected");',helpers,name+'-matrix'));
 assert.throws(()=>nativeGenerationPurgeFixture(original,helpers,'unexpected-matrix'));
 results.push({name,originalCases:count,exactAdaptedCaseBodies:true,refusalControls:3});
}
writeFileSync('work/generation-purge-native-preparation-20261023/bridge-controls.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
