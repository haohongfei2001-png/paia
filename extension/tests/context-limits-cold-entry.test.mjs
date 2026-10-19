import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
// Each first import is evaluated by a fresh process. Importing the constants
// first here would hide the original native ESM temporal-dead-zone regression.
for(const entry of ['context-item-lineage.js','context-read.js','ai-usage/assist-section-relevance.js','ai-usage/maintenance-existing-context.js','browser-native-sync/context-journal.js','browser-native-sync/manual-context-current-shape.js'])test('original cold entry '+entry+' resolves the one unchanged Context limits owner',()=>{
 const url=new URL('../core/'+entry,import.meta.url).href,leaf=new URL('../core/context-limits.js',import.meta.url).href,read=new URL('../core/context-read.js',import.meta.url).href,lineage=new URL('../core/context-item-lineage.js',import.meta.url).href;
 const code=`import assert from 'node:assert/strict';await import(${JSON.stringify(url)});const leaf=await import(${JSON.stringify(leaf)}),read=await import(${JSON.stringify(read)}),lineage=await import(${JSON.stringify(lineage)});assert.equal(read.CONTEXT_READ_LIMITS,leaf.CONTEXT_READ_LIMITS);assert.equal(lineage.CONTEXT_LINEAGE_LIMITS,leaf.CONTEXT_LINEAGE_LIMITS);assert.ok(Object.isFrozen(leaf.CONTEXT_READ_LIMITS));assert.ok(Object.isFrozen(leaf.CONTEXT_LINEAGE_LIMITS));assert.deepEqual(leaf.CONTEXT_READ_LIMITS,{page:20,scan:20,chunk:8192,outputBytes:256*1024,materialBytes:8*1024*1024,cursors:64,cursorMs:300000,verificationMs:1000,requestMs:10000});assert.deepEqual(leaf.CONTEXT_LINEAGE_LIMITS,{topics:8,inputs:16,associations:16,sources:128,readTopics:32,readInputs:256,hashBytes:8*1024*1024});`;
 const result=spawnSync(process.execPath,['--input-type=module','--eval',code],{encoding:'utf8'});assert.equal(result.signal,null);assert.equal(result.status,0,result.stderr||result.stdout);assert.equal(result.stderr,'');
});
test('original limits have one dependency-free declaration with unchanged public re-exports',()=>{
 const leaf=readFileSync(new URL('../core/context-limits.js',import.meta.url),'utf8');assert.doesNotMatch(leaf,/^\s*import\b|\bimport\s*\(|\bfrom\s*['"]/m);
 for(const [file,name]of [['context-read.js','CONTEXT_READ_LIMITS'],['context-item-lineage.js','CONTEXT_LINEAGE_LIMITS']]){
  const owner=readFileSync(new URL('../core/'+file,import.meta.url),'utf8');assert.doesNotMatch(owner,new RegExp('export\\s+const\\s+'+name+'\\s*='));assert.equal(leaf.match(new RegExp('export\\s+const\\s+'+name+'\\s*=','g'))?.length,1);assert.ok(owner.includes(`export {${name}} from './context-limits.js';`));
 }
});
