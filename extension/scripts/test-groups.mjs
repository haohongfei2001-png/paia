const CURRENT_BROWSER=new Set([
 'cpv1-topic-05-2-root-chrome-e2e.test.mjs',
 'context-cards-chrome-e2e.test.mjs',
 'cpv1-ctx4-05-maintenance-chrome-e2e.test.mjs',
 'consumer-cleanup-chrome-e2e.test.mjs',
 'desktop-vnext-context-chrome-e2e.test.mjs',
 'capture-foundation-chrome-e2e.test.mjs',
 'release-certification-round48-chrome-e2e.test.mjs',
 'release-certification-round49-chrome-e2e.test.mjs',
 'activation-return-round410-chrome-e2e.test.mjs',
 'uir-01-shell-chrome-e2e.test.mjs',
 'uir-02-archive-search-reader-chrome-e2e.test.mjs',
 'uir-03-thought-original-chrome-e2e.test.mjs',
 'uir-03-ai-presentation-chrome-e2e.test.mjs',
 'uir-03-ai-candidate-chrome-e2e.test.mjs',
 'uir-03-preview-mask-chrome-e2e.test.mjs'
]);
const EXPERIMENTAL=new Set([
 'settings-touch-diagnostic-chrome-e2e.test.mjs',
 'cpv1-07-lab-cadence.test.mjs',
 'cpv1-07-official-minilm.test.mjs',
 'cpv1-07-public-model-provenance.test.mjs',
 'cpv1-07-retrieval-evaluation.test.mjs',
 'cpv1-07-semantic-index.test.mjs',
 'cpv1-07-semantic-lab.test.mjs',
 'cpv1-07-semantic-material-snapshot.test.mjs',
 'cpv1-07-semantic-storage-chrome-e2e.test.mjs'
]);
const LEGACY_BROWSER=new Set([
 'ai-presentation-chrome-v072c.test.mjs','foundation-m5-mechanics.test.mjs','foundation-m5-e2e.test.mjs','foundation-m5-migration.test.mjs','organizer-m3-e2e.test.mjs','organizer-m3-performance.test.mjs','thought-m2-e2e.test.mjs','thought-m2-performance.test.mjs','thought-m1-e2e.test.mjs','dual-view-v071-e2e.test.mjs','light-coverage-e2e.test.mjs','smart-filter-diagnostics-e2e.test.mjs','smart-filter-ui-e2e.test.mjs','smart-filter-migration-e2e.test.mjs','ia-ui-e2e.test.mjs','export-probe-e2e.test.mjs','import-ui-e2e.test.mjs','readonly-gate-tool.test.mjs',
 'storage-migration-e2e.test.mjs','storage-performance.test.mjs','workspace-e2e.test.mjs','development-reload-e2e.test.mjs','library-e2e.test.mjs','extension.test.mjs','ui.test.mjs','diagnostic-ui.test.mjs','diagnostics-integration.test.mjs','response-time-integration.test.mjs','source-time-integration.test.mjs','product-e2e.test.mjs','backfill-e2e.test.mjs','structural-discovery.test.mjs','multi-source-e2e.test.mjs','compat-replay.test.mjs','historical-budget.test.mjs'
]);
function isCurrentUxBrowser(name){return /^ux-r\d+-.*-chrome-e2e\.test\.mjs$/.test(name);}
function isCurrentUirBrowser(name){return /^uir-\d+-.*-chrome-e2e\.test\.mjs$/.test(name);}
function isCurrentUisBrowser(name){return /^uis-\d+-.*-chrome-e2e\.test\.mjs$/.test(name);}
function isCurrentAnsBrowser(name){return /^ans-\d+-.*-chrome-e2e\.test\.mjs$/.test(name);}
function isCurrentCprBrowser(name){return /^cpr-\d+-.*-chrome-e2e\.test\.mjs$/.test(name);}
function isCurrentCpv1Browser(name){return /^cpv1-\d+-.*-chrome-e2e\.test\.mjs$/.test(name);}
export function group(file) {
 const name=file.split('/').at(-1);
 if(EXPERIMENTAL.has(name))return 'experimental';
 if(CURRENT_BROWSER.has(name)||isCurrentUxBrowser(name)||isCurrentUirBrowser(name)||isCurrentUisBrowser(name)||isCurrentAnsBrowser(name)||isCurrentCprBrowser(name)||isCurrentCpv1Browser(name))return 'browser E2E';
 if(name.endsWith('-chrome-e2e.test.mjs')||LEGACY_BROWSER.has(name))return 'historical browser E2E';
 if(['adapter.test.mjs','history-contract.test.mjs','json-fingerprint.test.mjs'].includes(name))return 'adapter contract';
 if(['history-privacy-v090.test.mjs','import-security.test.mjs','background-security.test.mjs','privacy-product.test.mjs','diagnostics.test.mjs','compat-sanitizer.test.mjs'].includes(name))return 'privacy/security';
 return 'unit';
}

/**
 * Keep the complete current browser corpus within the existing hosted-job
 * budget, routing only whole files. Historical comparison originally moved
 * from2 to4 after observed2 overload. Full36770990568 shows4 now overloaded
 * and1 finishes8m45s; its complete historical17 took6m11s. Route it to1,
 * preserving every case/fixture and the unchanged18-minute job limit.
 */
function priorStage3ATestShard(file, position, total, category) {
 const name=file.split('/').at(-1),root='cpv1-topic-05-2-root-chrome-e2e.test.mjs';
 // Full37648849130 exhausted shard6 while Thought shared the same18-minute
 // budget with Context and Settings. Isolate this whole file on7 and retain
 // every prior six-way placement, fixture, case and deadline exactly.
 // Full37684301966 shard4 used764s plus280s font setup and was cancelled
 // at job completion. Move its complete213s retained Root file to shard7,
 // which finished in553s total. Keep all75 files and the18-minute budget.
 // Main 37691533146 exhausted shard1 twice; move this complete ~258s file to shard4.
 // Preserve every case, all older-width routes and the unchanged 18-minute budget.
 if(category==='browser E2E'&&total===7&&name==='cpv1-07-historical-comparison-chrome-e2e.test.mjs')return 4;
 if(category==='browser E2E'&&total===7)return ['ux-r3-thought-chrome-e2e.test.mjs','cpv1-02-dvn-topic-root-chrome-e2e.test.mjs'].includes(name)?7:priorStage3ATestShard(file,position,6,category);
 // Full37554248921: shard3 took561s of1080s. Add the whole two-case
 // Root journey there, preserving every prior73 placement and every timeout.
 if(category==='browser E2E'&&[4,5,6].includes(total)){if(name===root)return 3;if(name>root)position--;}
 return previousTestShard(file,position,total,category);
}
function previousTestShard(file, position, total, category) {
 const name=file.split('/').at(-1),purge='cpv1-02-dvn-purge-chrome-e2e.test.mjs',removal='cpv1-02-dvn-removal-chrome-e2e.test.mjs',search='cpv1-02-dvn-search-chrome-e2e.test.mjs',directEdit='cpv1-02-dvn-direct-edit-chrome-e2e.test.mjs';
 // Full37134318053 exhausted2/4's18-minute budgets. Preserve all65
 // other placements; move complete Thought ownership to6 and the measured
 // Content/Years pair onto5's spare capacity. No file/case is split or skipped.
 if(category==='browser E2E'&&total===6){
  // Full37554001210 exhausted5 after both Context cases passed;6 took670s.
  // Move only the complete Context file (~182s) to6, preserving the prior72.
  if(name==='context-cards-chrome-e2e.test.mjs')return 6;
  // Full37323881161 exhausted3 while Settings alone took400s and6 took331s.
  // Move this complete file to6; keep all cases and the same18-minute budgets.
  if(name==='uir-04-settings-chrome-e2e.test.mjs')return 6;
  if(name==='ux-r3-thought-chrome-e2e.test.mjs')return 6;
  if(['cpv1-02-dvn-topic-content-chrome-e2e.test.mjs','cpv1-02-dvn-topic-years-chrome-e2e.test.mjs'].includes(name))return 5;
  return previousTestShard(file,position,5,category);
 }
 // D5 expands native/visual direct editing by more than200s. Keep every
 // other certified4-way placement; isolate this whole file on a fifth job.
 if(category==='browser E2E'&&total===5)return name===directEdit?5:previousTestShard(file,position,4,category);
 // Preserve the exact previously certified 59-file routing when inserting Q4.
 // Full36776666083 browser2 took9m16s versus1=16m04,3=14m31,4=12m46.
 // Put the complete six Source/release purge journeys on2; retain all cases
 // and the unchanged18-minute budget, without shifting every later file.
 if(category==='browser E2E'&&total===4){
  // CTX4-05 adds one complete native source/release owner on4. Compensate
  // here once, after the6->5->4 fallthrough, to preserve all73 old routes.
  if(name==='cpv1-ctx4-05-maintenance-chrome-e2e.test.mjs')return 4;
  if(name>'cpv1-ctx4-05-maintenance-chrome-e2e.test.mjs')position--;
  // CTX4 adds its whole source/release journey without shifting old placements.
  if(name==='context-cards-chrome-e2e.test.mjs')return 1;
  if(name>'context-cards-chrome-e2e.test.mjs')position--;
  // Consumer cleanup adds one complete source/release journey to shard1.
  // Subtract only its insertion so every preceding 71-file route is retained.
  if(name==='consumer-cleanup-chrome-e2e.test.mjs')return 1;
  if(name>'consumer-cleanup-chrome-e2e.test.mjs')position--;
  if(name==='cpv1-09-prompt-surface-chrome-e2e.test.mjs')return 3;
  if(name>'cpv1-09-prompt-surface-chrome-e2e.test.mjs')position--;
  // Keep all existing placements stable when adding the complete VS09 owner.
  if(name==='cpv1-09-prompt-compatibility-chrome-e2e.test.mjs')return 3;
  if(name>'cpv1-09-prompt-compatibility-chrome-e2e.test.mjs')position--;
  if(name==='cpv1-09-prompt-insertion-chrome-e2e.test.mjs')return 3;
  if(name>'cpv1-09-prompt-insertion-chrome-e2e.test.mjs')position--;
  if(name==='desktop-vnext-context-chrome-e2e.test.mjs')return 3;
  if(name>'desktop-vnext-context-chrome-e2e.test.mjs')position--;
  // D3 adds its entire source/release file to1; all66 previous placements stay.
  if(name==='cpv1-05-dvn-organize-chrome-e2e.test.mjs')return 1;
  if(name>'cpv1-05-dvn-organize-chrome-e2e.test.mjs')position--;
  // Q3 adds one whole Source/release file to2, retaining all60 previous
  // file placements and the unchanged18-minute budget. No case is omitted.
  // D1 Search adds one complete source/release file on2. All61 earlier
  // file placements, fixtures, cases and the18-minute budget remain intact.
  // Q5 full36812077556 used17m50s on2 versus13m08s on3. Q6 full
  // 36884491807 exceeded2's18-minute budget. Put only the new whole
  // Q6 file on3, preserving all62 earlier file placements and every case.
  // D2 Content retains all65 prior placements and adds its whole file to4.
  if(name==='cpv1-02-dvn-topic-content-chrome-e2e.test.mjs')return 4;
  if(name>'cpv1-02-dvn-topic-content-chrome-e2e.test.mjs')position--;
  // D2 whole source/release years file joins4; all64 previous file routes stay.
  if(name==='cpv1-02-dvn-topic-years-chrome-e2e.test.mjs')return 4;
  if(name>'cpv1-02-dvn-topic-years-chrome-e2e.test.mjs')position--;
  // D2 adds only its complete source/release root file to4; all63 prior routes stay.
  if(name==='cpv1-02-dvn-topic-root-chrome-e2e.test.mjs')return 4;
  if(name>'cpv1-02-dvn-topic-root-chrome-e2e.test.mjs')position--;
  if(name===directEdit)return 3;
  if(name===purge||name===removal||name===search)return 2;
  if(name>directEdit)position--;
  if(name>purge)position--;
  if(name>removal)position--;
  if(name>search)position--;
 }
 // The eight complete Source/release History journeys took 3m33s on full
 // 36767002782 and pushed shard4 past its unchanged18-minute job budget.
 // Shard1 completed in6m40s; move this WHOLE file there, without changing
 // its cases/fixtures or the current corpus and existing historical routing.
 if(category==='browser E2E'&&total===4
    &&file.split('/').at(-1)==='cpv1-02-dvn-working-revision-chrome-e2e.test.mjs')return 1;
 if(category==='browser E2E'&&total===4
    &&file.split('/').at(-1)==='cpv1-07-historical-comparison-chrome-e2e.test.mjs')return 1;
 return position%total+1;
}

// Admit the complete Stage3A owner without reindexing any preceding route.
export function testShard(file,position,total,category){
 const name=file.replaceAll('\\','/').split('/').pop(),next='cpv1-12-next-prompt-chrome-e2e.test.mjs';
 if(category==='browser E2E'&&[4,5,6,7].includes(total)){if(name===next)return 3;if(name>next)position--;}
 return priorStage3ATestShard(file,position,total,category);
}
