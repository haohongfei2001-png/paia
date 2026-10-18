// Static guard for the new development script only. This never imports or runs Chrome.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../scripts/capture-assist-development.mjs',import.meta.url),'utf8');

test('Assist development entry uses the original isolated cloud harness and bounded waits',()=>{
 assert.match(source,/process\.env\.GITHUB_ACTIONS,'true'/);
 assert.match(source,/refs\/heads\/evidence\/assist-development-20261018/);
 assert.match(source,/FakeChatGPT\.start\(\{extensionPath:root,headless:true,launchThroughPort:true\}\)/);
 assert.match(source,/routeComposer\(h\.context,root\)/);
 assert.match(source,/eventually\(fn,label,8000\)/);
 assert.match(source,/setDefaultTimeout\(8000\)/);
 assert.doesNotMatch(source,/force\s*:\s*true|waitForTimeout|\bsetTimeout\s*\(|connectOverCDP|launchPersistentContext|userDataDir\s*:/);
 assert.match(source,/the visible original button owns its native center hit/);
 assert.match(source,/fixedEntryAcrossMoreUnavailableInsertion:true/);
});

test('Assist development action leaves genuine default-off service and authorizations intact',()=>{
 assert.match(source,/readAssistServiceConfiguration\(\),null/);
 assert.match(source,/#surface-more/);assert.match(source,/#prompt-assist-open/);
 assert.match(source,/AI suggestions are unavailable\. Saved prompts remain available\./);
 for(const id of ['settings-assist-replyAccess','settings-assist-remoteProcessing'])assert.ok(source.includes('#'+id));
 assert.match(source,/opening Settings cannot grant or rotate permissions/);
 assert.match(source,/sessionPresent:false,localPresent:false/);
 assert.doesNotMatch(source,/PAIA_PROMPT_ASSIST_CONFIGURE|PAIA_PROMPT_NEXT_CONFIGURE|\.storage\.(?:local|session)\.(?:set|remove|clear)\s*\(/);
 assert.doesNotMatch(source,/\bnew\s+\w*Store\s*\(|\bimport\s*\(|serviceWorkers\s*\(|chrome\.runtime\.sendMessage\s*=/);
});

test('Assist development receipt binds two real screenshots and runtime hashes without body dumps',()=>{
 assert.match(source,/work\/assist-development/);
 assert.match(source,/sha,tree,runId:process\.env\.GITHUB_RUN_ID/);
 assert.match(source,/runtimeSha256\[file\]=hash\(await readFile/);
 assert.match(source,/sha256:hash\(await readFile\(join\(out,filename\)\)\)/);
 const screenshots=[...source.matchAll(/await screenshot\([^,]+,'([^']+)'/g)].map(match=>match[1]);
 assert.deepEqual(screenshots,['source-more-assist-unavailable.png','source-settings-assist-consents.png']);
 assert.match(source,/bodyFreeReceipt:true/);
 assert.doesNotMatch(source,/exactText:|\.content\s*\(|\.innerHTML|storage\.(?:local|session)\.get\(null\)/);
 for(const gate of ['fullCertification','releaseParity','realSite','liveProvider','humanVisualAcceptance','animationAcceptance'])assert.ok(source.includes(gate+":'NOT_RUN'"));
});

test('Assist development passes only after actual insertion and zero-network assertions',()=>{
 assert.match(source,/fixture\.text\(\)===text/);
 assert.match(source,/source:'SAVED_LOCAL_PROMPT'/);
 assert.match(source,/sendCount:0,enterCount:0/);
 assert.match(source,/external:0,provider:0,extension:0,history:0/);
 assert.match(source,/assert\.deepEqual\(h\.errors,\[\]\);assertZeroNetwork\(h\);receipt\.network=network\(h\)/);
 assert.ok(source.indexOf("receipt.native='PASS'")>source.indexOf("phase='final-original-boundaries'"));
 assert.match(source,/receipt\.native='FAIL';receipt\.failure=\{phase,name:error\.name\}/);
});
