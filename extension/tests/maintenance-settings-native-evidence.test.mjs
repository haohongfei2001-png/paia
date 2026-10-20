import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile, readdir, rm, symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {validateTap, validateRecord, validateRecordShape, validateEnvironment, collectEvidence, artifactPaths,
  scenarios, variants, sourceFiles} from '../scripts/check-maintenance-settings-native-evidence.mjs';
import {partitionSourceRoots, inspectSourceRoots} from '../../services/ai-gateway/scripts/run-maintenance-source-evidence.mjs';

// These are deterministic validator/workflow contracts. The synthetic fixtures
// below never run Chrome and never count as any of the eight native scenarios.
const head = 'a'.repeat(40), version = '0.55.3';
const hash = value => createHash('sha256').update(value).digest('hex');
const manifest = Buffer.from(JSON.stringify({version}));
const source = '/synthetic/source-extension';
const options = (variant, scenario, root = source) => ({variant, scenario, source:root, head, version, manifestHash:hash(manifest)});
const state = (enabled, phase = enabled ? 'on' : 'off', generation = 'synthetic-current') =>
  ({enabled, savedEnabled:phase === 'off_unconfirmed' || enabled, generation, phase, serviceAvailable:false});
const environment = () => ({head,node:'v22.20.0',chrome:'Google Chrome 155.0.8059.39',
  glyphPreflight:'HOSTED_CHROME_LAUNCH_PASS 155.0.8059.39',
  fonts:[{name:'fonts-wqy-zenhei',version:'0.9.45-8'},{name:'fonts-noto-cjk',version:'1:20220127+repack1-1'}],
  families:['Noto Serif CJK SC','Noto Sans CJK SC','WenQuanYi Zen Hei'].map(requested=>({requested,matched:requested}))});
function record(variant, scenario, root = source) {
  const stages = [{stage:'fresh-default-off', state:state(false)}];
  if (scenario === scenarios[0]) stages.push(
    {stage:'one-trusted-on-ack', state:state(true)}, {stage:'peer-off-ack', state:state(false)},
    {stage:'stale-dialog-denied'}, {stage:'actual-page-reload-retains-on'});
  if (scenario === scenarios[1]) stages.push(
    {stage:'exact-native-put-failed', state:state(false, 'off_unconfirmed')},
    {stage:'one-explicit-off-retry-committed'}, {stage:'actual-success-before-delivery-loss', state:state(true)});
  if (scenario === scenarios[2]) stages.push(
    {stage:'native-worker-stopped-and-fresh-heap-on', state:state(true, 'on', 'synthetic-worker-2')},
    {stage:'actual-browser-process-reopened-on', state:state(true, 'on', 'synthetic-browser-2')},
    {stage:'off-failure-warning-before-worker-loss'}, {stage:'unpersisted-off-boundary-observed', state:state(true)},
    {stage:'actual-browser-process-reopened-off', state:state(false)});
  if (scenario === scenarios[3]) for (const language of ['zh-CN','en']) stages.push({stage:'native-compact-keyboard',
    language, writes:[true,false], geometry:{x:8, right:312, width:304, overflow:0, pageOverflow:0}});
  return {variant, scenario, extensionPath:variant === 'source' ? root : '/synthetic/paia-maintenance-settings-release-original',
    sourceRoot:root, node:'v22.20.0', requestedHead:head, stages, scenarioCompleted:true,
    browser:'synthetic-browser-version', manifestSha256:variant === 'source' ? hash(manifest) : 'b'.repeat(64), manifestVersion:version};
}
const tap = 'TAP version 13\n' + variants.flatMap(variant => scenarios.map(scenario => `${scenario} (${variant})`))
  .map((name, index) => `ok ${index + 1} - Maintenance Settings native ${name}\n`).join('')
  + '1..8\n# tests 8\n# suites 0\n# pass 8\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n# duration_ms 1\n';
// Only the validator's header/size contract is exercised, not image decoding.
const png = Buffer.alloc(33);
Buffer.from([137,80,78,71,13,10,26,10]).copy(png); png.writeUInt32BE(13,8);
png.write('IHDR',12,'ascii'); png.writeUInt32BE(320,16); png.writeUInt32BE(900,20);
async function put(path, data) { await mkdir(dirname(path), {recursive:true}); await writeFile(path, data); }
async function files(root) {
  const output = [];
  async function walk(prefix) {
    for (const entry of await readdir(join(root, prefix), {withFileTypes:true})) {
      const path = join(prefix, entry.name);
      if (entry.isDirectory()) await walk(path); else output.push(path);
    }
  }
  await walk(''); return output.sort();
}
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'paia-settings-validator-contract-'));
  t.after(() => rm(root, {recursive:true, force:true}));
  const input = join(root, 'input'), staging = join(root, 'staging'), source = join(root, 'source');
  const attempt = join(input, 'paia-maintenance-settings-evidence-synthetic');
  for (const file of sourceFiles) await put(join(source, file), file === 'manifest.json' ? manifest : `synthetic ${file}\n`);
  await put(join(input, 'native.tap'), tap); await put(join(input, 'native.exit'), '0\n');
  await put(join(input, 'environment.json'), JSON.stringify(environment()));
  for (const variant of variants) for (const scenario of scenarios) {
    await put(join(attempt, variant, scenario, 'evidence.json'), JSON.stringify(record(variant, scenario, source)));
    if (scenario === scenarios[3]) for (const language of ['zh-CN','en']) for (const kind of ['dialog','settings'])
      await put(join(attempt, variant, scenario, `${language}-${kind}-320-text200.png`), png);
  }
  return {root, input, staging, source, head, attempt};
}

test('strict TAP accepts all eight actual identities and zero terminal skips', () => assert.equal(validateTap(tap, '0\n'), true));
test('environment requires actual original glyph preflight and both installed font identities', () => {
  assert.equal(validateEnvironment(environment(),head),true);
  let value=environment(); value.glyphPreflight='fc-match succeeded'; assert.throws(()=>validateEnvironment(value,head));
  value=environment(); value.fonts.pop(); assert.throws(()=>validateEnvironment(value,head));
  value=environment(); value.families[0].matched='DejaVu Sans'; assert.throws(()=>validateEnvironment(value,head));
  value=environment(); value.privateData='excluded'; assert.throws(()=>validateEnvironment(value,head));
});
for (const [name, altered, exit] of [
  ['nonzero actual process',tap,'1'], ['empty recursive child', 'Warning: recursive test runner\n','0'],
  ['missing leaf',tap.replace(/^ok 8 .*\n/m,''),'0'], ['wrong scenario',tap.replace(scenarios[0],'unrelated'),'0'],
  ['skipped terminal',tap.replace('# skipped 0','# skipped 1'),'0'], ['cancelled terminal',tap.replace('# cancelled 0','# cancelled 1'),'0'],
  ['duplicate terminal',tap+'# tests 8\n','0'], ['missing plan',tap.replace('1..8\n',''),'0'],
  ['duplicate plan',tap+'1..8\n','0'], ['early exit',tap.slice(0,tap.indexOf('1..8')),'0'],
  ['failed leaf',tap.replace('ok 3 -','not ok 3 -'),'0'], ['todo directive',tap.replace(`(${variants[0]})`, `(${variants[0]}) # TODO`),'0'],
]) test(`strict TAP rejects ${name}`, () => assert.throws(() => validateTap(altered, exit)));

test('all eight exact records validate each required stage and native identity', () => {
  for (const variant of variants) for (const scenario of scenarios) assert.equal(validateRecord(record(variant,scenario), options(variant,scenario)), true);
});
for (const [name, change] of [
  ['wrong head', r => { r.requestedHead = 'c'.repeat(40); }],
  ['wrong Node', r => { r.node = 'v24.0.0'; }],
  ['wrong source path', r => { r.extensionPath = '/copied/source'; }],
  ['wrong source root', r => { r.sourceRoot = '/unrelated/source'; }],
  ['wrong manifest', r => { r.manifestSha256 = 'c'.repeat(64); }],
  ['incomplete stages', r => { r.stages.pop(); }],
  ['failed scenario', r => { r.scenarioCompleted = false; }],
  ['hidden failure', r => { r.failure = {name:'Error',message:'synthetic failure'}; }],
  ['unknown content field', r => { r.content = 'not an allowed field'; }],
  ['nested unknown content', r => { r.stages[0].state.content = 'not allowed'; }],
  ['nonscalar cleanup', r => { r.cleanupFailure = {body:'not allowed'}; }],
  ['default enabled', r => { r.stages[0].state.enabled = true; }],
]) test(`strict record rejects ${name}`, () => {
  const r = record('source',scenarios[0]); change(r); assert.throws(() => validateRecord(r,options('source',scenarios[0])));
});
test('release must differ from source and preserve a real builder-directory identity', () => {
  const r = record('release',scenarios[0]); r.extensionPath = source;
  assert.throws(() => validateRecord(r,options('release',scenarios[0])), /RELEASE_PATH/);
});
test('actual reconstruction and keyboard sequences are mandatory', () => {
  let r = record('source',scenarios[2]); r.stages[2].state.generation = r.stages[1].state.generation;
  assert.throws(() => validateRecord(r,options('source',scenarios[2])), /GENERATION_REUSED/);
  r = record('source',scenarios[3]); r.stages[2].language = 'zh-CN';
  assert.throws(() => validateRecord(r,options('source',scenarios[3])), /LANGUAGES/);
  r = record('source',scenarios[3]); r.stages[1].writes = [false,true];
  assert.throws(() => validateRecord(r,options('source',scenarios[3])), /WRITE_SEQUENCE/);
  r = record('source',scenarios[3]); r.stages[1].geometry.right = 321;
  assert.throws(() => validateRecord(r,options('source',scenarios[3])), /LAYOUT/);
});
test('failure records are safe to stage but never successful evidence', () => {
  const r = record('source',scenarios[0]); r.stages = []; r.scenarioCompleted = false;
  r.failure = {name:'Error',message:'synthetic browser startup failure'};
  assert.equal(validateRecordShape(r),true);
  assert.throws(() => validateRecord(r,options('source',scenarios[0])), /RECORD_FAILED/);
});
test('collector copies only explicit eight JSON/eight PNG, hashes every artifact, and ignores profile trees', async t => {
  const f = await fixture(t);
  await put(join(f.attempt,'profile','IndexedDB','private-database'), 'excluded');
  await put(join(f.attempt,'source',scenarios[0],'arbitrary.json'), '{}');
  const result = await collectEvidence(f); assert.equal(result.ok,true,JSON.stringify(result.errors));
  const actual = await files(f.staging);
  assert.equal(actual.length,20); assert.equal(actual.filter(p=>p.endsWith('.png')).length,8);
  assert.ok(actual.every(path=>artifactPaths().includes(path)));
  const identity = JSON.parse(await readFile(join(f.staging,'identity.json')));
  assert.equal(identity.validatedRecords,8); assert.equal(identity.head,head); assert.equal(identity.sourceIdentity.length,sourceFiles.length);
  const sums = (await readFile(join(f.staging,'SHA256SUMS.txt'),'utf8')).trim().split('\n');
  assert.equal(sums.length,19);
  for (const line of sums) { const [expected,path] = line.split('  '); assert.equal(hash(await readFile(join(f.staging,path))),expected); }
});
test('collector keeps failed TAP/exit, incomplete safe JSON and optional failure PNG but fails the gate', async t => {
  const f = await fixture(t); await writeFile(join(f.input,'native.exit'),'1\n');
  const folder = join(f.attempt,'source',scenarios[0]);
  const r = record('source',scenarios[0],f.source); r.scenarioCompleted=false; r.stages=[];
  r.failure={name:'Error',message:'synthetic startup failure'};
  await writeFile(join(folder,'evidence.json'),JSON.stringify(r)); await put(join(folder,'failure.png'),png);
  const result = await collectEvidence(f); assert.equal(result.ok,false);
  assert.ok(result.errors.includes('NATIVE_PROCESS_NOT_SUCCESSFUL'));
  assert.equal((await readFile(join(f.staging,'native.exit'),'utf8')).trim(),'1');
  assert.ok((await files(f.staging)).includes(`source/${scenarios[0]}/failure.png`));
});
for (const [name, change] of [
  ['missing successful PNG', async f => rm(join(f.attempt,'source',scenarios[3],'en-dialog-320-text200.png'))],
  ['fake PNG bytes', async f => writeFile(join(f.attempt,'source',scenarios[3],'en-dialog-320-text200.png'),'not PNG')],
  ['missing scenario record', async f => rm(join(f.attempt,'release',scenarios[1],'evidence.json'))],
  ['multiple stale attempts', async f => mkdir(join(f.input,'paia-maintenance-settings-evidence-stale'))],
  ['no actual attempt', async f => rm(f.attempt,{recursive:true})],
  ['missing actual glyph preflight', async f => rm(join(f.input,'environment.json'))],
  ['wrong compact PNG width', async f => { const wrong=Buffer.from(png); wrong.writeUInt32BE(1280,16); await writeFile(join(f.attempt,'source',scenarios[3],'en-dialog-320-text200.png'),wrong); }],
  ['mixed release builds', async f => { const r=record('release',scenarios[1],f.source); r.manifestSha256='c'.repeat(64); await writeFile(join(f.attempt,'release',scenarios[1],'evidence.json'),JSON.stringify(r)); }],
]) test(`collector fails on ${name}`, async t => { const f=await fixture(t); await change(f); assert.equal((await collectEvidence(f)).ok,false); });
test('unknown record payload is rejected before artifact staging', async t => {
  const f=await fixture(t); const path=`source/${scenarios[0]}/evidence.json`;
  const r=record('source',scenarios[0],f.source); r.content='excluded';
  await writeFile(join(f.attempt,path),JSON.stringify(r)); const result=await collectEvidence(f);
  assert.equal(result.ok,false); assert.ok(!(await files(f.staging)).includes(path));
});
test('symlinked file and directory cannot enter approved artifact scope', async t => {
  const f=await fixture(t); const folder=join(f.attempt,'source',scenarios[0]);
  await rm(folder,{recursive:true}); const foreign=join(f.root,'foreign'); await mkdir(foreign);
  await put(join(foreign,'evidence.json'),JSON.stringify(record('source',scenarios[0],f.source)));
  await symlink(foreign,folder,'dir');
  const pngPath=join(f.attempt,'source',scenarios[3],'en-dialog-320-text200.png');
  await rm(pngPath); await put(join(f.root,'foreign.png'),png); await symlink(join(f.root,'foreign.png'),pngPath);
  const result=await collectEvidence(f); assert.equal(result.ok,false);
  assert.ok(result.errors.some(e=>e.includes('NON_REGULAR_EVIDENCE_DIRECTORY')));
  assert.ok(result.errors.some(e=>e.includes('NON_REGULAR_OR_OVERSIZE_EVIDENCE')));
});
test('fresh separate staging prevents stale files from licensing a later run', async t => {
  const f=await fixture(t); await mkdir(f.staging);
  await assert.rejects(collectEvidence(f),{code:'EEXIST'});
  await assert.rejects(collectEvidence({...f,staging:join(f.input,'nested')}),/SEPARATE_STAGING/);
});
test('CLI emits actual success and nonzero failure with no native/browser execution', async t => {
  const f=await fixture(t), script=fileURLToPath(new URL('../scripts/check-maintenance-settings-native-evidence.mjs',import.meta.url));
  const run=staging=>spawnSync(process.execPath,[script,f.input,staging,f.source,head],{encoding:'utf8',timeout:10000});
  let result=run(f.staging); assert.equal(result.status,0,result.stderr); assert.equal(JSON.parse(result.stdout).ok,true);
  await writeFile(join(f.input,'native.exit'),'1\n'); result=run(join(f.root,'failed-staging'));
  assert.equal(result.status,1,result.stderr); assert.equal(JSON.parse(result.stdout).ok,false);
});
test('supplement preserves both original jobs and uses bounded explicit eight-scenario evidence', async () => {
  const workflow=await readFile(new URL('../../.github/workflows/paia-maintenance-promotion-evidence.yml',import.meta.url),'utf8');
  const start=workflow.indexOf('  original-source-clients:');
  const end=workflow.indexOf('\n\n  # Required supplemental Settings gate.');
  assert.ok(start>0 && end>start);
  assert.equal(hash(workflow.slice(start,end).replaceAll(" || github.ref == 'refs/heads/codex/maintenance-purpose-settings-20261020'",'').replace('Validate all 53 roots','Validate all 52 roots')),'8989b881be1c2839b8fb5a501fcf4541a2df15ae61250446036c6a87e2b4ba88');
  assert.equal((workflow.match(/github\.ref == 'refs\/heads\/codex\/maintenance-purpose-settings-20261020'/g)||[]).length,3);
  assert.match(workflow,/branches: \[.*'codex\/maintenance-purpose-settings-20261020'/);
  const job=workflow.slice(end);
  assert.match(job,/timeout-minutes: 12\n/); assert.match(job,/node-version: '22'/);
  assert.match(job,/github\.event\.repository\.private == false/);
  assert.match(job,/node --test --test-concurrency=1 --test-reporter=tap tests\/settings-maintenance-chrome-e2e\.test\.mjs/);
  assert.match(job,/code=\$\?/); assert.match(job,/exit "\$code"/);
  assert.match(job,/retention-days: 7/); assert.match(job,/if-no-files-found: error/);
  assert.match(job,/apt-get install -y --no-install-recommends fonts-wqy-zenhei fonts-noto-cjk/);
  assert.match(job,/xvfb-run -a node scripts\/check-hosted-chrome\.mjs/);
  assert.doesNotMatch(job,/sources\.list|chrome-for-testing|curl |wget |apt-key/);
  assert.doesNotMatch(job,/continue-on-error|test-name-pattern|npm ci|services\/ai-gateway/);
  const uploaded=[...job.matchAll(/^            \$\{\{ runner\.temp \}\}\/paia-maintenance-settings-upload\/(.+)$/gm)].map(m=>m[1]);
  assert.deepEqual(uploaded,artifactPaths()); assert.equal(uploaded.length,28);
  assert.ok(uploaded.every(path=>!path.includes('*')&&!path.includes('..')));
});

const roots=JSON.parse(await readFile(new URL('../../services/ai-gateway/scripts/maintenance-source-roots.json',import.meta.url),'utf8'));
test('four reviewed source shards include all original 52 roots plus the complete signed source test',()=>{
 const shards=partitionSourceRoots(roots);
 assert.deepEqual(shards.map(x=>x.length),[14,13,13,13]); assert.deepEqual(shards.flat().sort(),roots);
 const before=roots.filter(p=>p!=='services/ai-gateway/tests/maintenance-source-processing.test.mjs');
 assert.equal(before.length,52); assert.equal(hash(JSON.stringify(before,null,2)+'\n'),'f922ea86d1570b4a6ca79e11edf598dcec5a381cd9fd648dec956ed18e11c2f7');
});
for(const [name,alter]of [
 ['missing',x=>x.slice(1)],['duplicate',x=>[x[0],...x.slice(0,-1)]],['unordered',x=>[...x].reverse()],
 ['outside path',x=>['../../outside.test.mjs',...x.slice(1)].sort()],
 ['unknown extension',x=>[...x.slice(1),'services/ai-gateway/tests/wrong.js'].sort()]
])test('source manifest rejects '+name+' before spawning',()=>assert.throws(()=>partitionSourceRoots(alter(roots))));
test('all 53 actual source files are present and inspected before selecting any shard',async()=>{
 const root=fileURLToPath(new URL('../../',import.meta.url)); const inspected=await inspectSourceRoots(root,roots);
 assert.equal(inspected.files.length,53); assert.ok(inspected.files.every(x=>x.bytes>0&&/^[a-f0-9]{64}$/.test(x.sha256)));
});
test('a missing root blocks the entire source set before any selected shard starts',async t=>{
 const root=await mkdtemp(join(tmpdir(),'paia-source-ci-'));t.after(()=>rm(root,{recursive:true,force:true}));
 for(const p of roots)await put(join(root,p),'// synthetic inspection fixture\n');
 const inspected=await inspectSourceRoots(root,roots);assert.equal(inspected.files.length,53);
 await rm(join(root,roots.at(-1)));await assert.rejects(inspectSourceRoots(root,roots),{code:'ENOENT'});
});
test('an original source-root symlink is rejected even when its target is readable',async t=>{
 const root=await mkdtemp(join(tmpdir(),'paia-source-ci-'));t.after(()=>rm(root,{recursive:true,force:true}));
 for(const p of roots)await put(join(root,p),'// fixture\n');await rm(join(root,roots[0]));
 await symlink(join(root,roots[1]),join(root,roots[0]));await assert.rejects(inspectSourceRoots(root,roots),/not a regular source root/);
});


// GitHub validates expression contexts before assigning any runner. A YAML
// parser accepting the file does not validate job-level context availability.
const jobEnvironmentContexts = new Set(['github','needs','strategy','matrix','vars','secrets','inputs']);
function assertJobEnvironmentContexts(workflow) {
  const jobs=workflow.match(/^jobs:\n([\s\S]*)$/m);assert.ok(jobs,'jobs mapping must be present');
  const blocks=[...jobs[1].matchAll(/^  ([a-zA-Z0-9_-]+):\n([\s\S]*?)(?=^  [a-zA-Z0-9_-]+:\n|$(?![\s\S]))/gm)];
  assert.ok(blocks.length>0,'job blocks must actually be inspected');
  for(const [,id,block] of blocks) {
    const beforeSteps=block.split(/^    steps:\s*$/m)[0];
    const env=beforeSteps.match(/^    env:\n((?:^      [^\n]*\n)+)/m)?.[1]??'';
    for(const [,expression] of env.matchAll(/\$\{\{([\s\S]*?)\}\}/g)) {
      // Ignore quoted property/literal strings, but retain the root before [.
      const code=expression.replace(/'(?:[^']|'')*'|"(?:[^"\\]|\\.)*"/g,'');
      for(const [,root] of code.matchAll(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\.|\[)/g))
        assert.ok(jobEnvironmentContexts.has(root.toLowerCase()),`unsupported job env context ${id}:${root}`);
    }
  }
  return true;
}
test('workflow contexts: actual job environments use only GitHub-supported pre-runner contexts',async()=>{
 const workflow=await readFile(new URL('../../.github/workflows/paia-maintenance-promotion-evidence.yml',import.meta.url),'utf8');
 assert.equal(assertJobEnvironmentContexts(workflow),true);
});
test('workflow contexts: runner dot/index and steps contexts are rejected at job env only',()=>{
 for(const expression of ['runner.temp',"runner['temp']",'RUNNER.temp','steps.ready.outputs.path'])
  assert.throws(()=>assertJobEnvironmentContexts(`jobs:\n  native:\n    env:\n      OUTPUT: \${{ ${expression} }}\n    steps:\n      - run: true\n`),/unsupported job env context/);
 assert.equal(assertJobEnvironmentContexts("jobs:\n  native:\n    env:\n      HEAD: ${{ github.sha }}\n    steps:\n      - name: legal runner contexts after assignment\n        env:\n          OUTPUT: ${{ runner.temp }}\n        run: echo ${{ runner.temp }}\n        with:\n          path: ${{ runner.temp }}/fixed/file\n"),true);
});
test('workflow contexts: original setup exports exactly two runner-temp paths for its step and later steps',async t=>{
 const workflow=await readFile(new URL('../../.github/workflows/paia-maintenance-promotion-evidence.yml',import.meta.url),'utf8');
 const job=workflow.slice(workflow.indexOf('  native-maintenance-purpose-settings:'));
 const setup=job.slice(job.indexOf('      - name: Require the actual test and existing Chrome at the exact candidate'),job.indexOf('      - name: Check strict evidence and original source-manifest contracts'));
 const init=setup.match(/          test -n "\$\{RUNNER_TEMP:-\}"\n([\s\S]*?)          test -f tests\/settings-maintenance-chrome-e2e\.test\.mjs\n/);
 assert.ok(init,'runner-temp initialization must execute in the original setup step');
 const snippet=('test -n "${RUNNER_TEMP:-}"\n'+init[1].replace(/^          /gm,''));
 assert.match(snippet,/export PAIA_SETTINGS_MAINTENANCE_OUTPUT PAIA_SETTINGS_MAINTENANCE_STAGING/);
 const root=await mkdtemp(join(tmpdir(),'paia-job-context-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const runner=join(root,'runner temp with spaces'),envFile=join(root,'github-env');await mkdir(runner);await writeFile(envFile,'');
 const result=spawnSync('bash',['-eu','-o','pipefail','-c',snippet+'\nprintf "%s\\n%s\\n" "$PAIA_SETTINGS_MAINTENANCE_OUTPUT" "$PAIA_SETTINGS_MAINTENANCE_STAGING"'],{encoding:'utf8',timeout:5000,env:{...process.env,RUNNER_TEMP:runner,GITHUB_ENV:envFile}});
 assert.equal(result.status,0,result.stderr);
 const output=join(runner,'paia-maintenance-settings-artifacts'),staging=join(runner,'paia-maintenance-settings-upload');
 assert.equal(result.stdout,`${output}\n${staging}\n`);
 assert.equal(await readFile(envFile,'utf8'),`PAIA_SETTINGS_MAINTENANCE_OUTPUT=${output}\nPAIA_SETTINGS_MAINTENANCE_STAGING=${staging}\n`);
});


// Execute the original production response dispatcher and local-tool classifier.
// A purpose STATUS must not publish ARCHIVE_CHANGED: the real Settings consumer
// rereads STATUS on that notification, so generic mutation routing self-loops.
async function dispatchPurposeRequest(type) {
 const worker=await readFile(new URL('../background/service-worker.js',import.meta.url),'utf8');
 const classifier=worker.match(/^const localToolRequest=.*;$/m)?.[0];
 const start=worker.indexOf('chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {');
 const end=worker.indexOf('\n\ninstallToolbarEntry',start);
 assert.ok(classifier&&start>=0&&end>start,'execute the exact production classifier and dispatcher');
 const effects={filters:0,archiveChanges:0,replies:[]},data={purpose:'unchanged-response'};
 let listener;
 const context={
  chrome:{runtime:{onMessage:{addListener(fn){listener=fn;}}}},
  handle:async()=>data,maintenanceMutation:()=>false,isAIStyleOnlyRequest:()=>false,
  scheduleFilter(){effects.filters++;return Promise.resolve();},
  notifyArchiveChanged(){effects.archiveChanges++;return Promise.resolve();},
 };
 runInNewContext(classifier+'\n'+worker.slice(start,end),context,{timeout:1000});
 assert.equal(listener({type},{},reply=>effects.replies.push(reply)),true);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(effects.replies.length,1,'the original response callback fires exactly once');
 assert.equal(effects.replies[0].ok,true);
 assert.equal(effects.replies[0].data,data,'classification does not replace the owner response');
 return effects;
}
for(const type of ['PAIA_MAINTENANCE_PROCESSING_STATUS','PAIA_MAINTENANCE_PROCESSING_CONFIGURE'])
 test('worker purpose routing: '+type+' never enters generic Filter or Archive mutation notification',async()=>{
  const effects=await dispatchPurposeRequest(type);
  assert.equal(effects.filters,0,'purpose reads/writes do not wake the unrelated Filter runner');
  assert.equal(effects.archiveChanges,0,'purpose reads/writes cannot trigger their own Settings reread');
 });
test('worker purpose routing: original ordinary mutation still schedules Filter and Archive notification',async()=>{
 const effects=await dispatchPurposeRequest('SET_ENABLED');
 assert.equal(effects.filters,1);assert.equal(effects.archiveChanges,1);
});
test('worker purpose routing: unknown purpose-like names do not gain the local-tool exemption',async()=>{
 const effects=await dispatchPurposeRequest('PAIA_MAINTENANCE_PROCESSING_UNKNOWN');
 assert.equal(effects.filters,1);assert.equal(effects.archiveChanges,1);
});
