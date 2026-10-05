import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const workflow=read('../../.github/workflows/paia-d7-archive-reader.yml'),script=read('../scripts/verify-d7-reader-dialogs.mjs'),reference=read('./harness/d7-reader-dialog-reference.mjs'),candidate=read('../../.github/workflows/paia-candidate.yml'),css=read('../ui/reader.css');
test('D7 Reader dialog proof stays bounded within the existing complete appearance owner',()=>{
 assert.match(workflow,/timeout-minutes: 12/);assert.match(workflow,/suite: \[appearance, compatibility\]/);
 assert.ok(workflow.includes("if: matrix.suite == 'appearance' && contains(github.event.pull_request.body, 'PAIA_D7_READER_DIALOGS')"));
 assert.ok(workflow.includes('xvfb-run -a node --test --test-concurrency=1 scripts/verify-d7-reader-dialogs.mjs'));
 assert.ok(workflow.includes('xvfb-run -a node --test --test-concurrency=1 $D7_FILES'));
 assert.match(workflow,/needs: \[appearance\]/);assert.match(workflow,/if: always\(\) && contains/);assert.doesNotMatch(workflow,/continue-on-error|test-name-pattern|test-skip-pattern/);
 assert.match(script,/for\(const variant of \['source','release'\]\)test/);assert.match(script,/timeout:90000/);
});
test('D7 retains immutable before identity and requires all exact-head after, reference and long-tail images',()=>{
 for(const value of ['e2f90cd8e81af5ba8bc3c840366d9e4f3e68f415','75a68058cb172eb08f7423bd6f4ddde1d921ebe6','11323020941','2eddef43e9b9924e7a2a4ed70c0e890b35b9f73f36e61df1aaa7644ee40dddab',"assert.equal(head,actualHead",'runtime:{source:runtime,release:releaseRuntime}',"phase:'after-approved-dialog-style-change'",'build_current_release.py','FakeChatGPT.start','openArchiveWindow',"openMenu(p,'查看原始内容')","openMenu(p,'版本历史')"])assert.ok(script.includes(value),value);
 for(const value of ["report.result,'PASS'",'report.head,process.env.PAIA_TESTED_HEAD','report.baseline.productionHead','report.baseline.testHead',"report.phase,'after-approved-dialog-style-change'",'report.rows.length,14',"['1440-light','1440-dark','1024-light','1023-light','320-dark','768-light-text200','320-dark-text200']",'extension/work/d7-reader-dialogs/','report.network','137,80,78,71,13,10,26,10',"['','-tail']",'reference-1440-${theme}.png','${row.name}-actions.png'])assert.ok(workflow.includes(value),value);
 assert.doesNotMatch(script,/setContent\(|addStyleTag\(|showModal\(/,'no fabricated production modal');assert.match(script,/\['font-size','line-height'\]/);assert.doesNotMatch(script,/setProperty\(['"](?:width|height|padding|overflow|display)/);
 assert.match(reference,/openD7Reference\(h,\{screen,width:1440,theme\}\)/);assert.match(reference,/assert.deepEqual\(master/);assert.match(reference,/screen==='A07'\?700:860/);assert.match(script,/CSS.getPlatformFontsForNode/);
});
test('D7 exact A07/A08 styles are isolated from the shared Source detail and preserve the existing History body owner',()=>{
 const replacement=css.slice(css.indexOf('/* Approved D6.2 A07/A08.'));
 assert.match(replacement,/#info-dialog\[data-reading-surface="original"\]/);assert.doesNotMatch(replacement,/#info-dialog(?!\[)/);
 for(const value of ['#info-dialog[data-reading-surface="original"]{width:min(700px,calc(100vw - 32px))}','#revision-dialog){padding:32px;overflow:hidden}','width:min(860px,calc(100vw - 32px))','#revision-dialog[open]{display:flex;flex-direction:column}','font:500 23px/32px var(--title-font)','#revision-list{min-height:0;max-width:100%;overflow:auto;overscroll-behavior:contain}','padding:20px 16px'])assert.ok(replacement.includes(value),value);
 assert.doesNotMatch(replacement,/height:650|position:sticky|\.working-history-compare/);assert.doesNotMatch(replacement,/:is\([^{}]+#revision-dialog\)\{[^}]*width:/,'shared is specificity cannot force Original width onto History');
 assert.ok(script.includes("#info-dialog[data-reading-surface=\"source-detail\"]"));assert.ok(script.includes("detail.heading.fontSize,'18px'"));assert.ok(script.includes('detail.dialog.width,720'));
});
test('D7 after proof retains complete originals, native revision sides, cancel and actual glyph reachability',()=>{
 for(const value of ['SYNTHETIC_ORIGINAL_END','SYNTHETIC_CURRENT_END',"typeof __readerDialogCopied==='string'","__readerDialogCopied),original",'reviewed.revision,before.revision+1',"Cancel never writes a restoration",'closeAndCheck(p,\'original\')','closeAndCheck(p,\'history\')',"after.dialog.scrollTop,0",'after.body.scrollTop>0','after.heading.y,proof.actual.heading.y','after.close.y,proof.actual.close.y','assertTitleVisibility','range.setEnd(text,start+tail.length)',"complete original Unicode tail',originalTail",'after-side comparison uses the selected real version',"records,sources",'h.extensionNetworkRequests,0'])assert.ok(script.includes(value),value);
});
test('D7 selects all twelve unchanged Original and Working History owner cases with the original targeted budget and required gate',()=>{
 const job=candidate.slice(candidate.indexOf('  targeted_browser:'),candidate.indexOf('\n  capture_recovery:')),step=job.slice(job.indexOf('      - name: D7 Reader Original'),job.indexOf('      - name: Retain D7 Reader'));
 assert.match(job,/timeout-minutes: 12/);assert.ok(job.split('    steps:')[0].includes('PAIA_D7_READER_DIALOGS'));assert.match(step,/ref:|test "\$\(git rev-parse HEAD\)" = "\$PAIA_TESTED_HEAD"/);
 assert.deepEqual([...step.matchAll(/tests\/([\w-]+\.test\.mjs)/g)].map(m=>m[1]),['cpv1-02-dvn-original-chrome-e2e.test.mjs','cpv1-02-dvn-working-revision-chrome-e2e.test.mjs']);assert.match(step,/--test-concurrency=1/);assert.match(step,/set -o pipefail/);assert.doesNotMatch(step,/test-name-pattern|test-skip-pattern|continue-on-error/);
 for(const value of ['report.total,12','report.pass,12','report.fail,0','report.skipped,0','head:process.env.PAIA_TESTED_HEAD'])assert.ok(step.includes(value),value);
 assert.match(candidate,/TOPIC_SELECTED:.*PAIA_D7_READER_DIALOGS/);assert.ok(candidate.includes('if [ "$TOPIC_SELECTED" = true ]; then test "$TARGETED_BROWSER" = success;'));assert.match(job,/if: always\(\) && contains\(github.event.pull_request.body, 'PAIA_D7_READER_DIALOGS'\)/);
 for(const marker of ['PAIA_DVN_COMPOSE_BROWSER','PAIA_DVN_CONTEXT_PRESENTATION_BROWSER','PAIA_DVN_TOPIC_BROWSER','PAIA_VS05_AI_CANDIDATE_BROWSER'])assert.ok(job.split('    steps:')[0].includes(marker));
});
test('The existing D5 modal owner uses exact approved replacements while Selection and its data assertions remain',()=>{
 const previous=read('./harness/d5-reading-surfaces.mjs');assert.match(previous,/Math.min\(700,width-32\)/);assert.match(previous,/Math.min\(860,width-32\)/);assert.doesNotMatch(previous,/Math.min\((?:720|960),width-32\)/);assert.match(previous,/openD5Reference\(h,'selection'\)/);assert.match(previous,/readerDialogContract\(originalRefs\[theme\],width\)/);assert.match(previous,/readerDialogContract\(historyRefs\[theme\],width\)/);assert.match(previous,/visual review and Cancel do not restore a revision/);assert.match(previous,/every retained fixed-geometry comparison must pass/);
});

test('Original complete owner enters its real phone disclosure without bypassing narrow actionability',()=>{
 const owner=read('./cpv1-02-dvn-original-chrome-e2e.test.mjs');
 for(const value of ['async function openCompactDocumentMenu(p,variant)',"assert.equal(p.viewportSize().width,320)","node.parentElement.id==='archive-compact-reader-actions'","if(!before.open)await compact.locator('summary').click()","await button.click()",'await openCompactDocumentMenu(p,variant)','compact-history-entry.json','compact-history-entry.png'])assert.ok(owner.includes(value),value);
 const helper=owner.slice(owner.indexOf('async function openCompactDocumentMenu'),owner.indexOf('const releaseRoot='));assert.doesNotMatch(helper,/setViewportSize|force:true|\.evaluate\([^;]*click\(/);
 for(const value of ['fixture(123,extensionPath)','messages.map(m=>m.text).join',"[1440,1024,768,390,320]",'bounds.height<=752',"name:'查看修改历史'",'globalThis.__copiedOriginal[1]',"assert.equal(await p.locator('dialog[open]').count(),1)"])assert.ok(owner.includes(value),value);
});

test('A11/A12 require both complete native owner files in the unchanged candidate budget',()=>{
 const candidate=read('../../.github/workflows/paia-candidate.yml'),job=candidate.slice(candidate.indexOf('  targeted_browser:'),candidate.indexOf('  shell_cutover:'));
 assert.match(job,/timeout-minutes: 12/);assert.match(job.split('    steps:')[0],/PAIA_D7_CONFIRMATION_UI/);
 const step=job.slice(job.indexOf('      - name: D7 removal and blocked-purge'),job.indexOf('      - name: Retain D7 confirmation'));
 assert.match(step,/tests\/cpv1-02-dvn-removal-chrome-e2e\.test\.mjs tests\/cpv1-02-dvn-purge-chrome-e2e\.test\.mjs/);assert.doesNotMatch(step,/test-name-pattern|test-skip-pattern|continue-on-error/);
 for(const value of ['report.total,16','report.pass,16','report.fail,0','report.skipped,0','head:process.env.PAIA_TESTED_HEAD'])assert.ok(step.includes(value),value);
 assert.match(candidate,/TOPIC_SELECTED:.*PAIA_D7_CONFIRMATION_UI/);assert.ok(candidate.includes('if [ "$TOPIC_SELECTED" = true ]; then test "$TARGETED_BROWSER" = success;'));
 assert.match(job,/if: always\(\) && contains\(github.event.pull_request.body, 'PAIA_D7_CONFIRMATION_UI'\)/);
});
