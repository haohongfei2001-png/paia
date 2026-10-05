import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const workflow=read('../../.github/workflows/paia-d7-archive-reader.yml'),script=read('../scripts/verify-d7-reader-dialogs.mjs');
test('D7 Reader dialog baseline appends a bounded whole-file command to the existing appearance owner',()=>{
 assert.match(workflow,/timeout-minutes: 12/);assert.match(workflow,/suite: \[appearance, compatibility\]/);
 assert.ok(workflow.includes("if: matrix.suite == 'appearance' && contains(github.event.pull_request.body, 'PAIA_D7_READER_DIALOGS')"));
 assert.ok(workflow.includes('xvfb-run -a node --test --test-concurrency=1 scripts/verify-d7-reader-dialogs.mjs'));
 assert.ok(workflow.includes('xvfb-run -a node --test --test-concurrency=1 $D7_FILES'));
 assert.match(workflow,/needs: \[appearance\]/);assert.match(workflow,/if: always\(\) && contains/);
 assert.doesNotMatch(workflow,/continue-on-error|test-name-pattern|test-skip-pattern/);
 assert.match(script,/for\(const variant of \['source','release'\]\)test/);assert.match(script,/timeout:90000/);
});
test('D7 baseline receipts distinguish production identity, candidate identity and actual source/release images',()=>{
 for(const value of ['e2f90cd8e81af5ba8bc3c840366d9e4f3e68f415',"assert.equal(head,actualHead",'runtime:{source:runtime,release:releaseRuntime}',"phase:'before-production-style-change'",'changed.every','build_current_release.py','FakeChatGPT.start','openArchiveWindow',"openMenu(p,'查看原始内容')","openMenu(p,'版本历史')"])assert.ok(script.includes(value),value);
 for(const value of ["report.result,'PASS'",'report.head,process.env.PAIA_TESTED_HEAD','report.baselineHead',"report.phase,'before-production-style-change'",'report.rows.length,6',"['A07-1440-light','A07-1440-dark','A07-320-dark','A08-1440-light','A08-1440-dark','A08-320-dark']",'extension/work/d7-reader-dialogs/','report.network','137,80,78,71,13,10,26,10'])assert.ok(workflow.includes(value),value);
 assert.doesNotMatch(script,/setContent\(|addStyleTag\(|style\.setProperty\(|showModal\(/,'no fake modal DOM or injected production styles');
});
test('D7 baseline retains actual full originals, native save, explicit cancellation and clearing',()=>{
 for(const value of ['SYNTHETIC_ORIGINAL_END','SYNTHETIC_CURRENT_END',"__readerDialogCopied),original",'reviewed.revision,before.revision+1',"Cancel never writes a restoration",'closeAndCheck(p,\'original\')','closeAndCheck(p,\'history\')','historyTail.dialog.scrollTop>0',"records,sources",'h.extensionNetworkRequests,0'])assert.ok(script.includes(value),value);
});
