export function group(file) {
 const name=file.split('/').at(-1);
 if(name.endsWith('-chrome-e2e.test.mjs')||name==='ai-presentation-chrome-v072c.test.mjs')return 'browser E2E';
 if(['foundation-m5-mechanics.test.mjs','foundation-m5-e2e.test.mjs','foundation-m5-migration.test.mjs','organizer-m3-e2e.test.mjs','organizer-m3-performance.test.mjs','thought-m2-e2e.test.mjs','thought-m2-performance.test.mjs','thought-m1-e2e.test.mjs','dual-view-v071-e2e.test.mjs','light-coverage-e2e.test.mjs','smart-filter-diagnostics-e2e.test.mjs','smart-filter-ui-e2e.test.mjs','smart-filter-migration-e2e.test.mjs','ia-ui-e2e.test.mjs','export-probe-e2e.test.mjs','import-ui-e2e.test.mjs','readonly-gate-tool.test.mjs'].includes(name))return 'browser E2E';
 if(['adapter.test.mjs','history-contract.test.mjs','json-fingerprint.test.mjs'].includes(name))return 'adapter contract';
 if(['history-privacy-v090.test.mjs','import-security.test.mjs','background-security.test.mjs','privacy-product.test.mjs','diagnostics.test.mjs','compat-sanitizer.test.mjs'].includes(name))return 'privacy/security';
 if(['storage-migration-e2e.test.mjs','storage-performance.test.mjs','workspace-e2e.test.mjs','development-reload-e2e.test.mjs','library-e2e.test.mjs','extension.test.mjs','ui.test.mjs','diagnostic-ui.test.mjs','diagnostics-integration.test.mjs','response-time-integration.test.mjs','source-time-integration.test.mjs','product-e2e.test.mjs','backfill-e2e.test.mjs','structural-discovery.test.mjs','multi-source-e2e.test.mjs','compat-replay.test.mjs','historical-budget.test.mjs'].includes(name))return 'browser E2E';
 return 'unit';
}
