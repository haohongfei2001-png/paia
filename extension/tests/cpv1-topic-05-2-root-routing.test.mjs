import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {group,testShard} from '../scripts/test-groups.mjs';
const root='cpv1-topic-05-2-root-chrome-e2e.test.mjs';
test('TOPIC-05.2 adds one complete current file and preserves every prior73 placement in4/5/6 partitions',async()=>{
 const names=(await readdir(new URL('./',import.meta.url))).filter(name=>name.endsWith('.test.mjs')&&group(name)==='browser E2E').sort(),manifest=JSON.parse(await readFile(new URL('../docs/consumer-product-v1/implementation/desktop-vnext/D5-Q6-FULL-MATRIX.json',import.meta.url),'utf8'));
 const old=manifest.rows.map(row=>({file:row.file,4:row.file==='cpv1-02-dvn-direct-edit-chrome-e2e.test.mjs'?3:row.before,5:row.before,6:row.file==='uir-04-settings-chrome-e2e.test.mjs'?6:row.after}));
 for(const file of ['cpv1-09-prompt-compatibility-chrome-e2e.test.mjs','cpv1-09-prompt-insertion-chrome-e2e.test.mjs','cpv1-09-prompt-surface-chrome-e2e.test.mjs'])old.push({file,4:3,5:3,6:3});old.push({file:'consumer-cleanup-chrome-e2e.test.mjs',4:1,5:1,6:1},{file:'context-cards-chrome-e2e.test.mjs',4:1,5:1,6:6});
 assert.equal(old.length,73);assert.equal(names.length,75);assert.deepEqual(names.filter(name=>name!==root&&name!=='cpv1-ctx4-05-maintenance-chrome-e2e.test.mjs'),old.map(row=>row.file).sort());
 for(const count of [4,5,6]){for(const row of old)assert.equal(testShard(row.file,names.indexOf(row.file),count,'browser E2E'),row[count],`${count}: ${row.file}`);assert.equal(testShard(root,names.indexOf(root),count,'browser E2E'),3);const all=Array.from({length:count},(_,slot)=>names.filter((file,index)=>testShard(file,index,count,'browser E2E')===slot+1)).flat();assert.equal(new Set(all).size,75);assert.equal(testShard('cpv1-ctx4-05-maintenance-chrome-e2e.test.mjs',names.indexOf('cpv1-ctx4-05-maintenance-chrome-e2e.test.mjs'),count,'browser E2E'),4);assert.deepEqual(all.sort(),names);}
});

test('TOPIC-05.2 Root and retained D2 keep complete commands and receipts in independent bounded jobs',async()=>{
 const workflow=await readFile(new URL('../../.github/workflows/paia-candidate.yml',import.meta.url),'utf8');
 const rootJob=workflow.split('  topic05_root:')[1].split('  targeted_browser:')[0],d2Job=workflow.split('  targeted_browser:')[1].split('  capture_recovery:')[0];
 const rootSteps=rootJob.slice(rootJob.indexOf('      - name: TOPIC05 complete production Root')).trim(),d2Steps=d2Job.slice(d2Job.indexOf('      - name: D2 exact root'),d2Job.indexOf('      - name: Fixed Context manifest')).trim();
 // Exact previously reviewed executable commands, every oracle and all artifact
 // checks survive the scheduling split. Full-certification shards are separate.
 const sha=value=>createHash('sha256').update(value).digest('hex');
 assert.equal(sha(rootSteps),'74c494437b8de8e62ae534eb15fd254559b0630bf27aa27e347d12bec284df77');
 assert.equal(sha(d2Steps),'2f77b158a81639f5309e3da0e4b48bb47b1e530bd054fe25f8a8b97caa8e11be');
 for(const job of [rootJob,d2Job]){assert.match(job,/timeout-minutes: 12/);assert.doesNotMatch(job,/continue-on-error|needs:/);assert.match(job,/ref: \$\{\{ github.event.pull_request.head.sha \}\}/);}
 const selected=(job,body)=>{const expression=job.match(/^    if: (.+)$/m)[1].replaceAll('github.event.pull_request.draft','draft').replaceAll('github.event.pull_request.body','body');return Function('draft','body','contains','return '+expression)(true,body,(text,needle)=>text.includes(needle));};
 for(const [body,root,d2]of [['',false,false],['PAIA_TOPIC05_ROOT_BROWSER',true,false],['PAIA_DVN_TOPIC_BROWSER',false,true],['PAIA_TOPIC05_ROOT_BROWSER PAIA_DVN_TOPIC_BROWSER',true,true]]){assert.equal(selected(rootJob,body),root);assert.equal(selected(d2Job,body),d2);}
});

test('TOPIC-05.2 aggregate refuses missing skipped cancelled or failed selected Root and retained jobs',async()=>{
 const workflow=await readFile(new URL('../../.github/workflows/paia-candidate.yml',import.meta.url),'utf8'),gate=workflow.split('  candidate:')[1];
 assert.match(gate,/needs: \[[^\]]*targeted_browser, topic_compatibility, topic05_root,/);
 const lines=gate.split('\n').filter(line=>['TOPIC05_ROOT_SELECTED','TOPIC_SELECTED','TOPIC_COMPAT_SELECTED'].some(key=>line.trim().startsWith('if [ "$'+key+'"'))).join('\n');assert.equal(lines.split('\n').length,3);
 for(const [root,d2]of [[true,false],[false,true],[true,true]]){
  const env={...process.env,TOPIC05_ROOT_SELECTED:String(root),TOPIC_SELECTED:String(d2),TOPIC_COMPAT_SELECTED:String(d2),TOPIC05_ROOT:root?'success':'skipped',TARGETED_BROWSER:d2?'success':'skipped',TOPIC_COMPAT:d2?'success':'skipped'};
  assert.equal(spawnSync('bash',['-e','-c',lines],{env}).status,0);
  for(const key of [...(root?['TOPIC05_ROOT']:[]),...(d2?['TARGETED_BROWSER','TOPIC_COMPAT']:[])])for(const state of ['','skipped','cancelled','failure'])assert.notEqual(spawnSync('bash',['-e','-c',lines],{env:{...env,[key]:state}}).status,0,key+' '+state);
 }
});
test('TOPIC-05.2 candidate marker requires both complete native variants and retains exact-head evidence',async()=>{
 const workflow=await readFile(new URL('../../.github/workflows/paia-candidate.yml',import.meta.url),'utf8'),job=workflow.split('  topic05_root:')[1].split('  targeted_browser:')[0],step=job.split('      - name: TOPIC05 complete production Root source and release journeys')[1].trim(),gate=workflow.split('  candidate:')[1];
 assert.match(job.split('    steps:')[0],/PAIA_TOPIC05_ROOT_BROWSER/);assert.match(job,/timeout-minutes: 12/);assert.match(job,/ref: \$\{\{ github.event.pull_request.head.sha \}\}/);assert.match(step,/set -o pipefail/);assert.match(step,/--test-concurrency=1/);assert.match(step,/tests\/cpv1-topic-05-2-root-chrome-e2e.test.mjs/);
 for(const guard of ['assert.equal(report.total,2)','assert.equal(report.pass,2)','assert.equal(report.fail,0)','assert.equal(report.skipped,0)','assert.equal(result.head,process.env.PAIA_TESTED_HEAD)','[30,50,100,144]','if-no-files-found: error'])assert.ok(step.includes(guard),guard);
 assert.doesNotMatch(step,/continue-on-error|test-name-pattern|test-skip-pattern/);assert.match(gate,/TOPIC05_ROOT_SELECTED:.*PAIA_TOPIC05_ROOT_BROWSER/);assert.match(gate,/if \[ "\$TOPIC05_ROOT_SELECTED" = true \]; then test "\$TOPIC05_ROOT" = success;/);
});
