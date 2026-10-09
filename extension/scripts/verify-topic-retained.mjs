import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
export const manifest=JSON.parse(await readFile(new URL('../tests/harness/topic-retained-candidate-v2.json',import.meta.url),'utf8'));
const read=async path=>JSON.parse(await readFile(path,'utf8'));
const ordered=rows=>[...rows].sort((a,b)=>JSON.stringify([a.file,a.name]).localeCompare(JSON.stringify([b.file,b.name])));
export function validatePart(part,head,events,report){
 assert.ok(Object.hasOwn(manifest.parts,part));assert.match(head,/^[a-f0-9]{40}$/);assert.equal(events.version,1);assert.equal(events.part,part);assert.equal(events.head,head);
 const files=manifest.parts[part],expected=manifest.cases.filter(row=>files.includes(row.file));
 assert.deepEqual(ordered(events.cases),ordered(expected),'every whole-file case and exact current outcome');
 const totals={pass:expected.filter(row=>row.outcome==='pass').length,fail:0,skipped:expected.filter(row=>row.outcome==='skipped').length};
 assert.equal(report.total,expected.length);for(const key of Object.keys(totals))assert.equal(report[key],totals[key]);
 assert.deepEqual(Object.keys(report.files).sort(),[...files].sort());assert.deepEqual(report.groups,{'browser E2E':totals});
 for(const file of files)assert.deepEqual(report.files[file],{pass:expected.filter(row=>row.file===file&&row.outcome==='pass').length,fail:0,skipped:expected.filter(row=>row.file===file&&row.outcome==='skipped').length});
 return {version:1,part,head,files:[...files],cases:expected,total:expected.length,...totals};
}
export function validateUnion(head,receipts){
 assert.equal(receipts.length,3);assert.deepEqual(receipts.map(row=>row.part).sort(),Object.keys(manifest.parts).sort());
 const files=receipts.flatMap(row=>row.files),cases=receipts.flatMap(row=>row.cases);
 assert.equal(new Set(files).size,7);assert.deepEqual([...files].sort(),Object.values(manifest.parts).flat().sort());
 assert.ok(receipts.every(row=>row.head===head));assert.deepEqual(ordered(cases),ordered(manifest.cases));
 for(const key of ['total','pass','fail','skipped'])assert.equal(receipts.reduce((n,row)=>n+row[key],0),manifest[key]);
 return {version:1,head,scope:manifest.scope,parts:receipts.map(row=>row.part),files,cases,total:manifest.total,pass:manifest.pass,fail:manifest.fail,skipped:manifest.skipped};
}
async function evidence(part,base,head){
 if(part==='core')for(const variant of ['source','release']){
  const root=await read(join(base,`qa-dvn-topic-root/${variant}.json`)),dense=await read(join(base,`qa-dvn-topic-root/${variant}-dense.json`));
  assert.equal(root.status,'PASS');assert.equal(root.headSha,head);assert.equal(root.matrix.length,12);assert.equal(root.zeroProviderCalls,true);
  assert.equal(dense.status,'PASS');assert.equal(dense.headSha,head);assert.equal(dense.topics,300);assert.equal(dense.retainedMetadata,300);assert.equal(dense.boundedProjectionPages,40);assert.equal(dense.bodyFreeSnapshots,true);assert.equal(dense.hiddenRootReleased,true);assert.equal(dense.zeroProviderCalls,true);
 }
 if(part==='content'||part==='years')for(const variant of ['source','release']){
  const receipt=await read(join(base,`qa-dvn-topic-${part}/d7/${variant}.json`));
  assert.equal(receipt.result,'PASS');assert.equal(receipt.head,head);assert.equal(receipt.headers.length,12);
  if(part==='content'){
   assert.deepEqual(receipt.headerInteractions.map(row=>row.kind),['native-keyboard-history','search-clear','text200-failure-layout','text200-failure-layout','coarse-controls','coarse-history','saved-ai-history-early-dismissal','saved-ai-header','back-original-return']);
   for(const row of receipt.headerInteractions.filter(row=>row.kind==='text200-failure-layout'))assert.equal(row.contentFocus.length,2);
  }
 }
}
async function main(){
 const [mode,value,head]=process.argv.slice(2);assert.match(head||'',/^[a-f0-9]{40}$/);
 if(mode==='part'){
  const base=resolve('work'),folder=join(base,'topic-retained',value),receipt=validatePart(value,head,await read(join(folder,'cases.json')),await read(join(folder,'test-summary.json')));
  await evidence(value,base,head);await writeFile(join(folder,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));return;
 }
 assert.equal(mode,'all');const root=resolve(value),receipts=[];
 for(const part of Object.keys(manifest.parts)){
  const base=join(root,`topic-retained-${part}-${head}`),folder=join(base,'topic-retained',part);
  const receipt=validatePart(part,head,await read(join(folder,'cases.json')),await read(join(folder,'test-summary.json')));
  assert.deepEqual(await read(join(folder,'receipt.json')),receipt);await evidence(part,base,head);receipts.push(receipt);
 }
 const result=validateUnion(head,receipts);await mkdir(root,{recursive:true});await writeFile(join(root,'combined.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
