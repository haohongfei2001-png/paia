import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('audit hosted gate selects exact head and complete owning test files without weakening other gates',async()=>{
 const workflow=await readFile(new URL('../../.github/workflows/paia-candidate.yml',import.meta.url),'utf8'),job=workflow.match(/^  audit_boundaries:\n([\s\S]*?)(?=^  \w+:)/m)?.[1];assert.ok(job);
 assert.match(job,/github.event.pull_request.draft == true.*PAIA_AUDIT_BOUNDARIES_BROWSER/);
 assert.match(job,/ref: \$\{\{ github.event.pull_request.head.sha \}\}/);assert.match(job,/persist-credentials: false/);assert.match(workflow,/permissions:\n  contents: read/);
 for(const name of ['cpv1-01-audit-boundaries','cpv1-01-recovery','cpv1-01-save-recovery','cpv1-02-dvn-save-outcome','cpv1-02-4-reader'])assert.ok(job.includes('tests/'+name+'-chrome-e2e.test.mjs'));
 assert.doesNotMatch(job,/continue-on-error|test-name-pattern|secrets\.|workflow_dispatch/);assert.match(job,/set -o pipefail/);assert.match(job,/assert.equal\(report.headSha,process.env.PAIA_TESTED_HEAD\)/);assert.match(job,/if-no-files-found: error/);
 assert.match(workflow,/needs: \[[^\]]*audit_boundaries/);assert.match(workflow,/if \[ "\$AUDIT_BOUNDARIES_SELECTED" = true \]; then test "\$AUDIT_BOUNDARIES" = success;/);
});
