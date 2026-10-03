import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {directEditCandidateFiles} from '../scripts/d5-direct-edit-matrix.mjs';
test('D5 candidate whole-file partition retains exact original Reader coverage once with unchanged watchdogs',async()=>{
 const expected=['tests/cpv1-02-dvn-direct-edit-chrome-e2e.test.mjs','tests/cpv1-02-4-reader-chrome-e2e.test.mjs','tests/uir-02-archive-search-reader-chrome-e2e.test.mjs','tests/ux-r2-reader-revisit-chrome-e2e.test.mjs'],files=Object.values(directEditCandidateFiles).flat();
 assert.equal(files.length,new Set(files).size);assert.deepEqual([...files].sort(),expected.sort());
 const workflow=await readFile(new URL('../../.github/workflows/paia-candidate.yml',import.meta.url),'utf8'),job=workflow.slice(workflow.indexOf('  direct_edit:'),workflow.indexOf('  shell_cutover:'));
 assert.match(job,/timeout-minutes: 12/);assert.match(job,/fail-fast: false/);assert.match(job,/suite: \[direct-edit, reader-regression\]/);assert.match(job,/d5-direct-edit-matrix\.mjs/);assert.doesNotMatch(job,/test-name-pattern|test-skip-pattern/);assert.match(job,/if: matrix\.suite == 'direct-edit'/);assert.match(job,/direct-edit-\$\{\{ github\.event\.pull_request\.head\.sha \}\}-\$\{\{ matrix\.suite \}\}/);
 for(const path of files)assert.ok((await readFile(new URL('../'+path,import.meta.url),'utf8')).includes('test('));
});
