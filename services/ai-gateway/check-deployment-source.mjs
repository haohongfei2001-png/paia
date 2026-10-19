import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import entry from './api/reservations.mjs';
import declarations from './api/declarations.mjs';
import provider from './api/provider.mjs';
import results from './api/results.mjs';
import operationStatus from './api/operation-status.mjs';
import identityCurrentness from './api/identity-currentness.mjs';

// Vercel's build check imports the ACTUAL entry and transitive original owners.
// No fetch/Pool/readiness/config/secret read occurs. Do not deploy a copied api/
// directory alone: static imports preserve the repository-relative topology.
assert.equal(typeof entry.fetch,'function');
assert.equal(typeof declarations.fetch,'function');
assert.equal(typeof provider.fetch,'function');
assert.equal(typeof results.fetch,'function');
assert.equal(typeof operationStatus.fetch,'function');
assert.equal(typeof identityCurrentness.fetch,'function');
const root=new URL('../../',import.meta.url);
const extension=JSON.parse(await readFile(new URL('extension/package.json',root),'utf8'));
assert.equal(extension.type,'module');
const service=JSON.parse(await readFile(new URL('./package.json',import.meta.url),'utf8'));
assert.equal(service.engines.node,'22.x');
assert.equal(service.dependencies.pg,'8.23.1');
const config=JSON.parse(await readFile(new URL('./vercel.json',import.meta.url),'utf8'));
assert.equal(config.outputDirectory,'public');
assert.equal(config.functions['api/reservations.mjs'].includeFiles,'../../extension/{package.json,core/constants.js,core/dedupe.js,core/ai-usage/{admission-policy,atomic-reservation,budget-window-policy,budget-window-reservation,contracts,filter-read-identity-data,qwen-request-data,ratebook,result-finalization,usage-normalization}.js}');
assert.equal(config.functions['api/declarations.mjs'].includeFiles,'../../extension/{package.json,core/constants.js,core/dedupe.js,core/ai-usage/{admission-policy,atomic-reservation,budget-window-policy,budget-window-reservation,client-declaration,contracts,filter-read-identity-data,qwen-request-data,ratebook,result-finalization,usage-normalization}.js}');
assert.equal(config.functions['api/provider.mjs'].includeFiles,'../../extension/{package.json,core/constants.js,core/dedupe.js,core/ai-usage/{admission-policy,atomic-reservation,budget-window-policy,budget-window-reservation,client-declaration,client-declaration-transport,client-gateway-http,client-provider-transport,client-reservation-transport,contracts,filter-read-identity-data,qwen-bpe-counter,qwen-profile-source-adapter,qwen-source-profile,qwen-source-profile-installations,qwen-wire-counter,qwen-json-decoder,qwen-qualified-request,qwen-request-data,qwen-request-profile,qwen-sse-decoder,qwen-usage-parser,qwen-wire-primitives,ratebook,result-finalization,usage-normalization}.js}');
assert.deepEqual(config.functions['api/results.mjs'],config.functions['api/reservations.mjs']);
assert.deepEqual(config.functions['api/operation-status.mjs'],config.functions['api/reservations.mjs']);
assert.deepEqual(config.functions['api/identity-currentness.mjs'],config.functions['api/reservations.mjs']);
assert.equal(config.functions['api/identity-currentness.mjs'].maxDuration,60);
console.log('SOURCE_GRAPH_OK (no deployment, database, readiness or financial qualification)');
