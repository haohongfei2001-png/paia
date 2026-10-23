import {readFile,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {nativePhasedHumanColdFixture} from '../../extension/tests/native-sync/phased-human-cold-fixture.mjs';
const helpers=await readFile(new URL('../../extension/tests/harness/thought-m1.mjs',import.meta.url),'utf8'),report=[];
for(const [file,command,total,selected] of [['canonical-generation-phased-stage.test.mjs','phased-human-cold-matrix',42,18],['canonical-generation-phased-copy-retirement.test.mjs','phased-copy-retirement-matrix',17,17],['checkpoint-manifest-storage-cold.test.mjs','checkpoint-storage-cold-matrix',6,6]]){
 const source=await readFile(new URL('../../extension/tests/'+file,import.meta.url),'utf8'),generated=nativePhasedHumanColdFixture(source,helpers,command);
 assert.equal(/node:|fake-indexeddb/.test(generated),false);assert.ok(generated.includes('if(selected.length!=='+selected+')'));
 // Registration only: no original test callback, owner, IDB, native command or
 // browser/build is executed. Imports are syntax-preserved in the saved module.
 const registration=generated.replace(/^import[^\n]*\n/gm,'').replace(/\bexport /g,'');
 const previous=globalThis.__bnsNative;let cases;try{cases=Function(registration+'\nreturn cases;')();}finally{if(previous===undefined)delete globalThis.__bnsNative;else globalThis.__bnsNative=previous;}
 assert.equal(cases.length,total);const names=(command==='phased-human-cold-matrix'?cases.filter(item=>/^(explicit cold rehydration|cold original expectation|cold completed readiness|cold readonly readiness|cold publication crash|fixed phased seal rejects real late semantic-)/.test(item.name)):cases).map(x=>x.name);assert.equal(names.length,selected);assert.equal(new Set(names).size,selected);
 assert.throws(()=>nativePhasedHumanColdFixture(source.replace('new LibraryDocumentsStore(','new OtherStore('),helpers,command),/NATIVE_OWNER_CONSTRUCTORS_CHANGED/);
 await writeFile(new URL('./'+command+'.mjs',import.meta.url),generated);
 report.push({file,command,totalRegistered:total,selected,owningSha256:createHash('sha256').update(source).digest('hex'),generatedSha256:createHash('sha256').update(generated).digest('hex'),names});
}
assert.throws(()=>nativePhasedHumanColdFixture('',helpers,'unknown'),/NATIVE_OWNER_COMMAND/);
await writeFile(new URL('./checks.json',import.meta.url),JSON.stringify({node:process.version,registrationOnly:true,browserRun:false,buildRun:false,report},null,2)+'\n');console.log('3 factory bridges compose and register exact original 18/17/6 selected cases; no callbacks executed');
