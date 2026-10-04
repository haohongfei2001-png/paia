import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {D7_FULL_MATRIX,D7_ARCHIVE_MATRIX,D7_BROWSER_SUITES} from './harness/d7-archive-matrix.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('D7 selects complete exact-head Archive/Reader journeys without filtering or budget expansion',()=>{
 const workflow=read('../../.github/workflows/paia-d7-archive-reader.yml');
 assert.match(workflow,/if: contains\(github.event.pull_request.body, 'PAIA_D7_ARCHIVE_READER'\)/);
 assert.match(workflow,/ref: \$\{\{ github.event.pull_request.head.sha \}\}/);assert.match(workflow,/timeout-minutes: 12/);assert.match(workflow,/set -o pipefail/);
 const command=workflow.split('\n').find(line=>line.includes('xvfb-run -a node --test'));
 assert.match(command,/--test-concurrency=1 \$D7_FILES /);assert.ok(workflow.includes('D7_FILES="$(node scripts/d7-archive-suite.mjs "$PAIA_D7_SUITE")"'));assert.ok(workflow.includes('PAIA_D7_SUITE: ${{ matrix.suite }}'));
 assert.doesNotMatch(workflow,/continue-on-error|test-name-pattern|test-skip-pattern/);assert.match(workflow,/if: always\(\)/);
 for(const value of ["report.result,'PASS'",'report.head,process.env.PAIA_TESTED_HEAD','row.status===\'PASS\'','report.errors,[]','report.network','D7_FULL_MATRIX.length,23','D7_ARCHIVE_MATRIX.length,10'])assert.ok(workflow.includes(value),value);
});
test('D7 whole-file partitions preserve every prior case and require both jobs',()=>{
 const prior=['scripts/verify-d7-archive-reader.mjs','tests/uir-01-shell-chrome-e2e.test.mjs','tests/cpv1-02-1-shell-chrome-e2e.test.mjs'],all=Object.values(D7_BROWSER_SUITES).flat();
 assert.deepEqual(Object.keys(D7_BROWSER_SUITES),['appearance','compatibility']);assert.deepEqual(all,[...prior,'tests/ans-05-navigator-workspace-chrome-e2e.test.mjs']);assert.equal(new Set(all).size,all.length);
 const resolver=fileURLToPath(new URL('../scripts/d7-archive-suite.mjs',import.meta.url));for(const [suite,files]of Object.entries(D7_BROWSER_SUITES))assert.equal(execFileSync(process.execPath,[resolver,suite],{encoding:'utf8'}),files.join(' '));assert.throws(()=>execFileSync(process.execPath,[resolver,'missing'],{stdio:'pipe'}));
 const workflow=workflowGuard();assert.match(workflow,/suite: \[appearance, compatibility\]/);assert.match(workflow,/fail-fast: false/);assert.match(workflow,/needs: \[appearance\]/);assert.ok(workflow.includes('D7_MATRIX_RESULT: ${{ needs.appearance.result }}'));assert.ok(workflow.includes('run: test "$D7_MATRIX_RESULT" = success'));assert.match(workflow,/if: always\(\) && contains/);
});
test('D7 preserves every old width/theme while adding explicit Reader stress coverage',()=>{
 const dimensions=[1440,1280,1024,768,320].flatMap(width=>['light','dark'].map(theme=>`${width}-${theme}`));
 assert.deepEqual(D7_ARCHIVE_MATRIX.map(row=>`${row.width}-${row.theme}`),dimensions);
 assert.deepEqual(D7_FULL_MATRIX.filter(row=>row.screen==='A02'&&!row.stress).map(row=>`${row.width}-${row.theme}`),dimensions);
 assert.equal(new Set(D7_FULL_MATRIX.map(row=>row.id)).size,23);assert.equal(D7_FULL_MATRIX.filter(row=>row.stress==='text200').length,2);assert.equal(D7_FULL_MATRIX.filter(row=>row.stress==='coarse').length,1);
 const script=read('../scripts/verify-d7-archive-reader.mjs');assert.match(script,/for\(const variant of \['source','release'\]\)test/);assert.match(script,/timeout:300000/);assert.match(script,/head!==actualHead/);
 const prior=read('./uir-01-shell-chrome-e2e.test.mjs');assert.match(prior,/matrix:'archive'/);assert.match(prior,/matrix:'reader-compat'/);assert.match(prior,/readerOnly:true/);const helper=read('./harness/d7-archive-reference.mjs');assert.match(helper,/if\(!mastersVerified\).*unpack_masters\.py/);assert.match(workflowGuard(),/reader-compat/);assert.doesNotMatch(prior,/compareD5Shell|compareD5Archive/);assert.match(prior,/timeout:240000/);
});

function workflowGuard(){return read('../../.github/workflows/paia-d7-archive-reader.yml');}
