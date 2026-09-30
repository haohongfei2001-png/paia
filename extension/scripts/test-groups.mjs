const CURRENT_BROWSER=new Set([
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
export function testShard(file, position, total, category) {
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
