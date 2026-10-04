import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('whole appearance evidence requires the same exact head and every source/release page',()=>{
 const workflow=read('../../.github/workflows/paia-appearance-preview.yml'),script=read('../scripts/verify-desktop-appearance-preview.mjs');
 assert.match(workflow,/if: contains\(github.event.pull_request.body, 'PAIA_DVN_WHOLE_APPEARANCE'\)/);assert.match(workflow,/timeout-minutes: 12/);assert.match(workflow,/ref: \$\{\{ github.event.pull_request.head.sha \}\}/);assert.match(workflow,/set -o pipefail/);assert.match(workflow,/--test-concurrency=1 scripts\/verify-desktop-appearance-preview.mjs/);assert.doesNotMatch(workflow,/continue-on-error|test-name-pattern|test-skip-pattern/);
 for(const value of ["report.result,'PASS'",'report.head,process.env.PAIA_TESTED_HEAD','report.rows.length,55','report.errors,[]','row.actual.root.width>0&&row.actual.heading.height>0','row.actual.modal,false'])assert.ok(workflow.includes(value),value);
 assert.match(workflow,/if: always\(\)/);assert.match(script,/for\(const variant of \['source','release'\]\)test/);assert.match(script,/assert.deepEqual\(\(await h.state\(\)\).records,originals/);assert.match(script,/assert.equal\(h.extensionNetworkRequests,0\)/);assert.match(script,/assert.equal\(h.deepSeekRequests.length,0\)/);
});
