import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('audit hosted gate selects exact head and complete owning test files without weakening other gates',async()=>{
 const workflow=await readFile(new URL('../../.github/workflows/paia-candidate.yml',import.meta.url),'utf8'),job=workflow.match(/^  audit_boundaries:\n([\s\S]*?)(?=^  \w+:)/m)?.[1];assert.ok(job);
 assert.match(job,/github.event.pull_request.draft == true.*PAIA_AUDIT_BOUNDARIES_BROWSER/);
 assert.match(job,/ref: \$\{\{ github.event.pull_request.head.sha \}\}/);assert.match(job,/persist-credentials: false/);assert.match(workflow,/permissions:\n  contents: read/);
 const commands=job.split('\n').filter(line=>line.includes('xvfb-run -a node --test'));assert.equal(commands.length,2);
 assert.deepEqual(commands[0].match(/tests\/[\w-]+\.test\.mjs/g),['cpv1-01-audit-boundaries','cpv1-01-recovery','cpv1-01-save-recovery','cpv1-02-dvn-save-outcome','cpv1-02-4-reader'].map(name=>'tests/'+name+'-chrome-e2e.test.mjs'));
 assert.doesNotMatch(commands[0],/test-name-pattern|test-skip-pattern|test-only/);
 assert.deepEqual(commands[1].match(/tests\/[\w-]+\.test\.mjs/g),['tests/cpv1-01-save-recovery-chrome-e2e.test.mjs']);
 assert.ok(commands[1].includes("--test-name-pattern='CPV1-01.1 (interrupted Input save|stale recovery draft)|^S02 '"));
 assert.match(job,/timeout-minutes: 12/);assert.ok(job.includes('npm run build:release'));
 for(const text of ['PAIA_RECOVERY_EXTENSION_PATH: .','PAIA_RECOVERY_EXTENSION_PATH: work/current-release','PAIA_RECOVERY_EVIDENCE_DIR: work/audit-boundaries/source/recovery','PAIA_RECOVERY_EVIDENCE_DIR: work/audit-boundaries/release/recovery','path: extension/work/audit-boundaries/',"report.variant,variant","row.capture.sha256","text.lineScale-2","control.width>=44&&control.height>=44","count('pass'),variant==='source'?23:4","count('skipped'),0","VS-04 failed Archive removal remains visible until retry durably saves it"])assert.ok(job.includes(text),text);
 assert.doesNotMatch(job,/continue-on-error|test-skip-pattern|test-only|secrets\.|workflow_dispatch/);assert.match(job,/set -o pipefail/);assert.match(job,/assert.equal\(report.headSha,process.env.PAIA_TESTED_HEAD\)/);assert.match(job,/if-no-files-found: error/);
 assert.match(workflow,/needs: \[[^\]]*audit_boundaries/);assert.match(workflow,/if \[ "\$AUDIT_BOUNDARIES_SELECTED" = true \]; then test "\$AUDIT_BOUNDARIES" = success;/);
});
