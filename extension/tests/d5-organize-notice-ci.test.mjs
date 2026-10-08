import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8'),workflow=read('../../.github/workflows/paia-candidate.yml');
const targeted=workflow.slice(workflow.indexOf('  targeted_browser:'),workflow.indexOf('\n  capture_recovery:')),step=targeted.slice(targeted.indexOf('      - name: D5 existing running'),targeted.indexOf('      - name: Retain D5 running'));
const compatibility=workflow.slice(workflow.indexOf('  organize_candidate_compatibility:'),workflow.indexOf('  context_compatibility:')),aggregate=workflow.slice(workflow.indexOf('  candidate:'));
const manifest=JSON.parse(read('./harness/d5-organize-notice-manifest.json'));
const names=source=>{const result=[...source.matchAll(/^test\('([^']+)'/gm)].map(match=>match[1]);for(const match of source.matchAll(/^for\(const variant of \['source','release'\]\)test\(`([^`]+)`/gm))for(const variant of ['source','release'])result.push(match[1].replace('${variant}',variant));return result.sort();};
test('D5 notice historical mapping and D7 retained owner registrations stay explicit',()=>{
 assert.equal(manifest.totalCases,13);assert.equal(Object.values(manifest.before).flat().length,11);assert.equal(Object.values(manifest.after).flat().length,13);
 const allFiles=Object.values(manifest.jobs).flat();assert.equal(new Set(allFiles).size,3);assert.deepEqual(allFiles.sort(),Object.keys(manifest.after).sort());
 for(const [file,expected]of Object.entries(manifest.after)){assert.deepEqual(names(read('./'+file)),[...manifest.d7Current[file],...(manifest.currentAdditions[file]||[])].sort(),file);assert.equal(manifest.d7Current[file].length,expected.length);assert.equal(new Set(manifest.d7Current[file]).size,expected.length);for(const prior of manifest.before[file])assert.ok(expected.includes(prior),prior);assert.equal(new Set(expected).size,expected.length);}
 assert.deepEqual(manifest.currentAdditions,{'uir-03-ai-presentation-chrome-e2e.test.mjs':['TOPIC-05.7 saved revision waits for Unicode selection and composition (release)','TOPIC-05.7 saved revision waits for Unicode selection and composition (source)']});
 assert.equal(manifest.after['uir-03-ai-presentation-chrome-e2e.test.mjs'].length,4);assert.equal(manifest.after['ux-r5-ai-organize-chrome-e2e.test.mjs'].length,4);assert.equal(manifest.after['uir-03-ai-candidate-chrome-e2e.test.mjs'].length,5);
});
test('D5 notice marker admits exactly the two required bounded jobs and all complete files',()=>{
 const marker='PAIA_DVN_ORGANIZE_NOTICES_BROWSER';assert.ok(targeted.split('    steps:')[0].includes(marker));assert.match(compatibility,/draft == true && contains\(github.event.pull_request.body, 'PAIA_DVN_ORGANIZE_NOTICES_BROWSER'\)/);
 for(const job of [targeted,compatibility]){assert.match(job,/timeout-minutes: 12/);assert.match(job,/ref: \$\{\{ github.event.pull_request.head.sha \}\}/);assert.match(job,/fonts-wqy-zenhei/);}
 const commands=[step,compatibility].map(block=>block.split('\n').find(line=>line.includes('xvfb-run')));for(const command of commands){assert.match(command,/--test-concurrency=1/);assert.doesNotMatch(command,/test-name-pattern|test-skip-pattern/);}
 assert.deepEqual([...commands[0].matchAll(/tests\/([\w-]+\.test\.mjs)/g)].map(match=>match[1]),manifest.jobs.targeted_browser);assert.deepEqual([...commands[1].matchAll(/tests\/([\w-]+\.test\.mjs)/g)].map(match=>match[1]),manifest.jobs.organize_candidate_compatibility);
 for(const block of [step,compatibility]){assert.match(block,/set -o pipefail/);assert.doesNotMatch(block,/continue-on-error/);assert.ok(block.includes('report.fail,0'));assert.ok(block.includes('report.skipped,0'));assert.ok(block.includes("receipt.result,'PASS'"));assert.ok(block.includes('receipt.head,process.env.PAIA_TESTED_HEAD'));}
 for(const text of ['report.total,10','report.pass,10','receipt.rows.length,20','receipt.targets.length,3',"'keyboard-stop','touch-stop','stale-retained-refusal'"])assert.ok(step.includes(text),text);for(const text of ['report.total,5','report.pass,5','receipt.rows.length,24'])assert.ok(compatibility.includes(text),text);
});
test('D5 notice aggregate propagates failed cancelled or skipped selected compatibility',()=>{
 assert.match(aggregate,/needs: \[[^\]]*organize_candidate_compatibility, sync_native_storage\]/);assert.ok(aggregate.includes('ORGANIZE_COMPAT: ${{ needs.organize_candidate_compatibility.result }}'));assert.match(aggregate,/TOPIC_SELECTED:.*PAIA_DVN_ORGANIZE_NOTICES_BROWSER/);assert.match(aggregate,/ORGANIZE_COMPAT_SELECTED:.*PAIA_DVN_ORGANIZE_NOTICES_BROWSER/);
 for(const [selected,value]of [['true','success'],['true','failure'],['true','cancelled'],['true','skipped'],['false','skipped']]){const line=aggregate.split('\n').find(line=>line.includes('if [ "$ORGANIZE_COMPAT_SELECTED"'));assert.ok(line);const result=spawnSync('bash',['-c',line.trim()],{env:{...process.env,ORGANIZE_COMPAT_SELECTED:selected,ORGANIZE_COMPAT:value}});assert.equal(result.status===0,value==='success'||selected==='false');}
 assert.match(aggregate,/if \[ "\$TOPIC_SELECTED" = true \]; then test "\$TARGETED_BROWSER" = success;/);assert.match(compatibility,/if: always\(\)/);assert.match(targeted,/if: always\(\) && contains\(github.event.pull_request.body, 'PAIA_DVN_ORGANIZE_NOTICES_BROWSER'\)/);
});
