import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {D7_FULL_MATRIX,D7_ARCHIVE_MATRIX} from './harness/d7-archive-matrix.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('D7 selects complete exact-head Archive/Reader journeys without filtering or budget expansion',()=>{
 const workflow=read('../../.github/workflows/paia-d7-archive-reader.yml');
 assert.match(workflow,/if: contains\(github.event.pull_request.body, 'PAIA_D7_ARCHIVE_READER'\)/);
 assert.match(workflow,/ref: \$\{\{ github.event.pull_request.head.sha \}\}/);assert.match(workflow,/timeout-minutes: 12/);assert.match(workflow,/set -o pipefail/);
 const command=workflow.split('\n').find(line=>line.includes('xvfb-run -a node --test'));
 for(const file of ['scripts/verify-d7-archive-reader.mjs','tests/uir-01-shell-chrome-e2e.test.mjs','tests/cpv1-02-1-shell-chrome-e2e.test.mjs'])assert.equal(command.split(file).length-1,1);
 assert.doesNotMatch(workflow,/continue-on-error|test-name-pattern|test-skip-pattern/);assert.match(workflow,/if: always\(\)/);
 for(const value of ["report.result,'PASS'",'report.head,process.env.PAIA_TESTED_HEAD','row.status===\'PASS\'','report.errors,[]','report.network','D7_FULL_MATRIX.length,23','D7_ARCHIVE_MATRIX.length,10'])assert.ok(workflow.includes(value),value);
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
