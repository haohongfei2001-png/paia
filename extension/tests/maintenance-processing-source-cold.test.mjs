import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
for(const path of ['core/idb-repository.js','core/ai-usage/maintenance-source-processing.js','core/ai-usage/maintenance-qualification.js','core/ai-usage/local-maintenance-session.js','background/maintenance-processing-commands.js'])test('independent cold ESM entry '+path,()=>{
 const url=new URL('../'+path,import.meta.url).href;
 const result=spawnSync(process.execPath,['--input-type=module','-e',`await import(${JSON.stringify(url)});process.stdout.write('loaded')`],{encoding:'utf8',timeout:10000});
 assert.equal(result.status,0,result.stderr);assert.equal(result.stdout,'loaded');
});
