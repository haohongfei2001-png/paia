import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {manifest,validatePart,validateUnion} from '../scripts/verify-topic-retained.mjs';
const head='a'.repeat(40),clone=value=>structuredClone(value);
function fixture(part){
 const cases=manifest.cases.filter(row=>manifest.parts[part].includes(row.file)),counts=rows=>({pass:rows.filter(row=>row.outcome==='pass').length,fail:0,skipped:rows.filter(row=>row.outcome==='skipped').length}),totals=counts(cases);
 return {events:{version:1,part,head,cases:clone(cases)},report:{total:cases.length,...totals,groups:{'browser E2E':{...totals}},files:Object.fromEntries(manifest.parts[part].map(file=>[file,counts(cases.filter(row=>row.file===file))]))}};
}
const receipt=part=>{const f=fixture(part);return validatePart(part,head,f.events,f.report);};
test('Retained Thought exact whole-file accounting preserves16 active cases and one named owner deferral',()=>{
 const result=validateUnion(head,Object.keys(manifest.parts).map(receipt));assert.deepEqual([result.total,result.pass,result.fail,result.skipped],[17,16,0,1]);assert.equal(result.files.length,7);assert.match(result.scope,/not zero-skip or full TOPIC-05 acceptance/);
});
for(const fault of ['missing','extra','wrong-name','wrong-file','unexpected-skip','wrong-reason','unskipped-deferral','failed','cancelled','wrong-head','wrong-part','summary-count','summary-file','summary-group'])test('Retained Thought rejects '+fault,()=>{
 const f=fixture('core'),rows=f.events.cases,skip=rows.find(row=>row.outcome==='skipped');
 if(fault==='missing')rows.pop();if(fault==='extra')rows.push(clone(rows[0]));if(fault==='wrong-name')rows[0].name+=' changed';if(fault==='wrong-file')rows[0].file='other.test.mjs';
 if(fault==='unexpected-skip'){rows[0].outcome='skipped';rows[0].skipReason=skip.skipReason;}if(fault==='wrong-reason')skip.skipReason='new unapproved skip';if(fault==='unskipped-deferral'){skip.outcome='pass';skip.skipReason=null;}
 if(['failed','cancelled'].includes(fault))rows[0].outcome=fault;if(fault==='wrong-head')f.events.head='b'.repeat(40);if(fault==='wrong-part')f.events.part='years';if(fault==='summary-count')f.report.pass--;if(fault==='summary-file')delete f.report.files[rows[0].file];if(fault==='summary-group')f.report.groups={};
 assert.throws(()=>validatePart('core',head,f.events,f.report));
});
for(const fault of ['missing-shard','duplicate-shard','overlap-file','wrong-head','missing-case','wrong-total'])test('Retained Thought aggregate rejects '+fault,()=>{
 const rows=Object.keys(manifest.parts).map(receipt);if(fault==='missing-shard')rows.pop();if(fault==='duplicate-shard')rows[1]=clone(rows[0]);if(fault==='overlap-file')rows[1].files=[rows[0].files[0]];if(fault==='wrong-head')rows[1].head='b'.repeat(40);if(fault==='missing-case')rows[1].cases.pop();if(fault==='wrong-total')rows[1].total++;
 assert.throws(()=>validateUnion(head,rows));
});
test('Retained reporter preserves the actual Node skip reason alongside the unchanged existing summary',async()=>{
 const cwd=await mkdtemp(join(tmpdir(),'paia-retained-reporter-')),reporter=fileURLToPath(new URL('../scripts/topic-retained-report.mjs',import.meta.url));
 try{
  await writeFile(join(cwd,'fixture.test.mjs'),"import test from 'node:test';test('SYNTHETIC passing',()=>{});test('SYNTHETIC deferred',{skip:'Owner deferred this single return-position check'},()=>{});\n");
  const env={...process.env,PAIA_TESTED_HEAD:head,PAIA_TOPIC_RETAINED_PART:'core'};delete env.NODE_TEST_CONTEXT;
  const run=spawnSync(process.execPath,['--test','--test-reporter='+reporter,'fixture.test.mjs'],{cwd,env,encoding:'utf8'});assert.equal(run.status,0,run.stderr);
  const events=JSON.parse(await readFile(join(cwd,'work/topic-retained/core/cases.json'),'utf8')),summary=JSON.parse(await readFile(join(cwd,'work/test-summary.json'),'utf8'));
  assert.equal(events.head,head);assert.equal(events.cases[1].skipReason,'Owner deferred this single return-position check');assert.deepEqual([summary.total,summary.pass,summary.fail,summary.skipped],[2,1,0,1]);
 }finally{await rm(cwd,{recursive:true,force:true});}
});
test('Root-only D2-only and combined selectors require every selected native shard and validator',async()=>{
 const workflow=await readFile(new URL('../../.github/workflows/paia-candidate.yml',import.meta.url),'utf8'),job=name=>workflow.split('  '+name+':')[1].split(/\n  [a-z0-9_]+:\n/)[0],rootJob=job('topic05_root'),retained=job('topic_retained'),generic=job('targeted_browser'),gate=job('candidate');
 const selected=(value,body)=>Function('draft','body','contains','return '+value.match(/^    if: (.+)$/m)[1].replaceAll('github.event.pull_request.draft','draft').replaceAll('github.event.pull_request.body','body'))(true,body,(s,q)=>s.includes(q));
 for(const [body,root,d2]of [['',false,false],['PAIA_TOPIC05_ROOT_BROWSER',true,false],['PAIA_DVN_TOPIC_BROWSER',false,true],['PAIA_TOPIC05_ROOT_BROWSER PAIA_DVN_TOPIC_BROWSER',true,true]]){
  assert.equal(selected(rootJob,body),root);assert.equal(selected(retained,body),d2);assert.equal(selected(generic,body),false,'no duplicate whole-file run in generic job');
  const env={...process.env,TOPIC05_ROOT_SELECTED:String(root),TOPIC_RETAINED_SELECTED:String(d2),TOPIC_COMPAT_SELECTED:String(d2),TOPIC05_ROOT:root?'success':'skipped',TOPIC_RETAINED:d2?'success':'skipped',TOPIC_RETAINED_RESULTS:d2?'success':'skipped',TOPIC_COMPAT:d2?'success':'skipped'};
  const lines=gate.split('\n').filter(line=>['TOPIC05_ROOT_SELECTED','TOPIC_RETAINED_SELECTED','TOPIC_COMPAT_SELECTED'].some(key=>line.trim().startsWith('if [ "$'+key+'"'))).join('\n');assert.equal(lines.split('\n').length,3);assert.equal(spawnSync('bash',['-e','-c',lines],{env}).status,0);
  for(const key of [...(root?['TOPIC05_ROOT']:[]),...(d2?['TOPIC_RETAINED','TOPIC_RETAINED_RESULTS','TOPIC_COMPAT']:[])])for(const state of ['','failure','cancelled','skipped'])assert.notEqual(spawnSync('bash',['-e','-c',lines],{env:{...env,[key]:state}}).status,0,key+' '+state);
 }
 for(const value of [rootJob,retained]){assert.match(value,/timeout-minutes: 12/);assert.match(value,/ref: \$\{\{ github.event.pull_request.head.sha \}\}/);assert.doesNotMatch(value,/continue-on-error|test-name-pattern|test-skip-pattern/);}
 assert.match(retained,/fail-fast: false/);assert.match(job('topic_retained_results'),/needs: \[topic_retained\]/);assert.match(gate,/topic_retained, topic_retained_results/);
 const rootSteps=rootJob.slice(rootJob.indexOf('      - name: TOPIC05 complete production Root')).trim();assert.equal(createHash('sha256').update(rootSteps).digest('hex'),'74c494437b8de8e62ae534eb15fd254559b0630bf27aa27e347d12bec284df77');
});
