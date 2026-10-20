import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile, readdir, rm, symlink, truncate} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {validateTap, validateRecord, validateRecordShape, validateEnvironment, collectEvidence, artifactPaths, planSettingsViewportFrames,
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
const coverage = (pageHeight = 2135, contentWidth = 305, originalScrollY = 90) => ({
  viewportWidth:320, viewportHeight:900, contentWidth, gutterWidth:320-contentWidth,
  pageHeight, dpr:1, scale:1, originalScrollY, restoredScrollY:originalScrollY,
  frames:planSettingsViewportFrames(pageHeight,900).map(frame=>({...frame,pngWidth:320,pngHeight:900})),
});
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
    language, writes:[true,false], geometry:{x:8, right:312, width:304, overflow:0, pageOverflow:0}, coverage:coverage()});
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
    if (scenario === scenarios[3]) for (const language of ['zh-CN','en']) for (const kind of ['dialog','settings','settings-middle','settings-bottom'])
      await put(join(attempt, variant, scenario, `${language}-${kind}-320-text200.png`), png);
  }
  return {root, input, staging, source, head, attempt};
}

test('production viewport planner covers exact one/two/three-frame boundaries with the fixed 128px overlap', () => {
  for (const pageHeight of [1,899,900]) assert.deepEqual(planSettingsViewportFrames(pageHeight,900),[{kind:'settings',scrollY:0}]);
  assert.deepEqual(planSettingsViewportFrames(1589,900),[{kind:'settings',scrollY:0},{kind:'settings-bottom',scrollY:689}]);
  assert.deepEqual(planSettingsViewportFrames(1672,900),[{kind:'settings',scrollY:0},{kind:'settings-bottom',scrollY:772}]);
  assert.deepEqual(planSettingsViewportFrames(1673,900),[{kind:'settings',scrollY:0},{kind:'settings-middle',scrollY:772},{kind:'settings-bottom',scrollY:773}]);
  assert.deepEqual(planSettingsViewportFrames(2135,900),[{kind:'settings',scrollY:0},{kind:'settings-middle',scrollY:772},{kind:'settings-bottom',scrollY:1235}]);
  assert.deepEqual(planSettingsViewportFrames(2444,900),[{kind:'settings',scrollY:0},{kind:'settings-middle',scrollY:772},{kind:'settings-bottom',scrollY:1544}]);
  assert.deepEqual(planSettingsViewportFrames(32768,32768),[{kind:'settings',scrollY:0}]);
  assert.deepEqual(planSettingsViewportFrames(131,129),[{kind:'settings',scrollY:0},{kind:'settings-middle',scrollY:1},{kind:'settings-bottom',scrollY:2}]);
});
for (const invalid of [0,-1,1.5,NaN,Infinity,-Infinity,Number.MAX_SAFE_INTEGER+1,'900',null,undefined]) {
  test('production viewport planner rejects invalid page height '+String(invalid), () => assert.throws(()=>planSettingsViewportFrames(invalid,900),/INVALID_SETTINGS_VIEWPORT_HEIGHTS/));
  test('production viewport planner rejects invalid viewport height '+String(invalid), () => assert.throws(()=>planSettingsViewportFrames(900,invalid),/INVALID_SETTINGS_VIEWPORT_HEIGHTS/));
}
test('production viewport planner refuses over-limit heights and over-capacity coverage, never a partial bottom', () => {
  for (const height of [1,128]) assert.throws(()=>planSettingsViewportFrames(900,height),/INVALID_SETTINGS_VIEWPORT_HEIGHTS/);
  assert.throws(()=>planSettingsViewportFrames(32769,900),/INVALID_SETTINGS_VIEWPORT_HEIGHTS/);
  for (const height of [2445,32768]) assert.throws(()=>planSettingsViewportFrames(height,900),/SETTINGS_VIEWPORT_FRAME_CAPACITY/);
  assert.throws(()=>planSettingsViewportFrames(132,129),/SETTINGS_VIEWPORT_FRAME_CAPACITY/);
});
test('production viewport planner always covers every bounded compact page with at least 128px overlap', () => {
  for (let height=1;height<=2444;height++) {
    const frames=planSettingsViewportFrames(height,900);
    assert.equal(frames[0].scrollY,0); assert.ok(frames.length<=3);
    assert.equal(frames.at(-1).scrollY,Math.max(0,height-900));
    for (let i=1;i<frames.length;i++) {
      assert.ok(frames[i].scrollY>frames[i-1].scrollY);
      assert.ok(frames[i-1].scrollY+900-frames[i].scrollY>=128);
    }
  }
});

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
test('compact coverage accepts actual classic or overlay gutters and exact restored scroll boundaries', () => {
  for (const [height,width,scrollY] of [[900,320,0],[1589,305,689],[2135,305,0],[2444,320,1544]]) {
    const r=record('source',scenarios[3]);
    for (const stage of r.stages.slice(1)) stage.coverage=coverage(height,width,scrollY);
    assert.equal(validateRecord(r,options('source',scenarios[3])),true);
  }
});
test('successful compact records require coverage for each language; incomplete failures stay diagnostic', () => {
  for (const index of [1,2]) {
    const r=record('source',scenarios[3]); delete r.stages[index].coverage;
    assert.equal(validateRecordShape(r),true,'an interrupted capture may omit the uncompleted coverage');
    assert.throws(()=>validateRecord(r,options('source',scenarios[3])),/UNEXPECTED_EVIDENCE_FIELDS/);
    r.scenarioCompleted=false; r.failure={name:'Error',message:'synthetic interrupted capture'};
    assert.equal(validateRecordShape(r),true);
  }
});
for (const pageHeight of [500,899]) test(`successful compact record refuses page height ${pageHeight} below its actual viewport`,()=>{
  const r=record('source',scenarios[3]); r.stages[1].coverage=coverage(pageHeight,305,0);
  assert.throws(()=>validateRecordShape(r),/INVALID_SETTINGS_PAGE_HEIGHT/);
  assert.throws(()=>validateRecord(r,options('source',scenarios[3])),/INVALID_SETTINGS_PAGE_HEIGHT/);
});
for (const [name,change] of [
  ['null coverage',r=>{r.stages[1].coverage=null;}],
  ['partial coverage',r=>{delete r.stages[1].coverage.restoredScrollY;}],
  ['unknown coverage field',r=>{r.stages[1].coverage.content='excluded';}],
  ['coverage on unrelated stage',r=>{r.stages[0].coverage=coverage();}],
  ['resized viewport width',r=>{r.stages[1].coverage.viewportWidth=321;}],
  ['resized viewport height',r=>{r.stages[1].coverage.viewportHeight=899;}],
  ['zero content width',r=>{r.stages[1].coverage.contentWidth=0;}],
  ['oversize content width',r=>{r.stages[1].coverage.contentWidth=321;}],
  ['nonfinite content width',r=>{r.stages[1].coverage.contentWidth=Infinity;}],
  ['string content width',r=>{r.stages[1].coverage.contentWidth='305';}],
  ['fake gutter',r=>{r.stages[1].coverage.gutterWidth=0;}],
  ['negative gutter',r=>{r.stages[1].coverage.gutterWidth=-15;}],
  ['nonfinite gutter',r=>{r.stages[1].coverage.gutterWidth=NaN;}],
  ['device pixel ratio change',r=>{r.stages[1].coverage.dpr=2;}],
  ['visual viewport scale change',r=>{r.stages[1].coverage.scale=1.25;}],
  ['zero page height',r=>{r.stages[1].coverage.pageHeight=0;}],
  ['fractional page height',r=>{r.stages[1].coverage.pageHeight=2135.5;}],
  ['unsafe page height',r=>{r.stages[1].coverage.pageHeight=Number.MAX_SAFE_INTEGER+1;}],
  ['over-limit page height',r=>{r.stages[1].coverage.pageHeight=32769;}],
  ['over-capacity page height',r=>{r.stages[1].coverage.pageHeight=2445;}],
  ['original scroll below zero',r=>{r.stages[1].coverage.originalScrollY=-1;}],
  ['original scroll past bottom',r=>{r.stages[1].coverage.originalScrollY=1236;}],
  ['nonfinite original scroll',r=>{r.stages[1].coverage.originalScrollY=Infinity;}],
  ['nonfinite restored scroll',r=>{r.stages[1].coverage.restoredScrollY=NaN;}],
  ['restored scroll below zero',r=>{r.stages[1].coverage.restoredScrollY=-1;}],
  ['restored scroll past bottom',r=>{r.stages[1].coverage.restoredScrollY=1236;}],
  ['fake restore',r=>{r.stages[1].coverage.restoredScrollY=91;}],
  ['matching but impossible restored scroll',r=>{r.stages[1].coverage.originalScrollY=r.stages[1].coverage.restoredScrollY=1236;}],
  ['missing frames',r=>{delete r.stages[1].coverage.frames;}],
  ['nonarray frames',r=>{r.stages[1].coverage.frames={};}],
  ['empty frames',r=>{r.stages[1].coverage.frames=[];}],
  ['missing bottom',r=>{r.stages[1].coverage.frames.pop();}],
  ['missing middle',r=>{r.stages[1].coverage.frames.splice(1,1);}],
  ['fourth extra frame',r=>{r.stages[1].coverage.frames.push({...r.stages[1].coverage.frames.at(-1)});}],
  ['unknown frame field',r=>{r.stages[1].coverage.frames[1].path='../excluded.png';}],
  ['partial frame',r=>{delete r.stages[1].coverage.frames[1].pngHeight;}],
  ['wrong frame order',r=>{r.stages[1].coverage.frames.reverse();}],
  ['wrong frame kind',r=>{r.stages[1].coverage.frames[1].kind='settings-bottom';}],
  ['wrong first offset',r=>{r.stages[1].coverage.frames[0].scrollY=1;}],
  ['gapped middle',r=>{r.stages[1].coverage.frames[1].scrollY=901;}],
  ['insufficient overlap',r=>{r.stages[1].coverage.frames[1].scrollY=773;}],
  ['wrong bottom offset',r=>{r.stages[1].coverage.frames[2].scrollY=1234;}],
  ['string frame offset',r=>{r.stages[1].coverage.frames[1].scrollY='772';}],
  ['resized PNG width',r=>{r.stages[1].coverage.frames[1].pngWidth=640;}],
  ['fullpage PNG height',r=>{r.stages[1].coverage.frames[1].pngHeight=2135;}],
]) test('strict coverage rejects '+name+' in both record shape and successful proof',()=>{
  const r=record('source',scenarios[3]); change(r);
  assert.throws(()=>validateRecordShape(r));
  assert.throws(()=>validateRecord(r,options('source',scenarios[3])));
});
test('failure records are safe to stage but never successful evidence', () => {
  const r = record('source',scenarios[0]); r.stages = []; r.scenarioCompleted = false;
  r.failure = {name:'Error',message:'synthetic browser startup failure'};
  assert.equal(validateRecordShape(r),true);
  assert.throws(() => validateRecord(r,options('source',scenarios[0])), /RECORD_FAILED/);
});
test('collector copies only explicit eight JSON/at most sixteen viewport PNGs, hashes every artifact, and ignores profile trees', async t => {
  const f = await fixture(t);
  await put(join(f.attempt,'profile','IndexedDB','private-database'), 'excluded');
  await put(join(f.attempt,'source',scenarios[0],'arbitrary.json'), '{}');
  const result = await collectEvidence(f); assert.equal(result.ok,true,JSON.stringify(result.errors));
  const actual = await files(f.staging);
  assert.equal(actual.length,28); assert.equal(actual.filter(p=>p.endsWith('.png')).length,16);
  assert.ok(actual.every(path=>artifactPaths().includes(path)));
  const identity = JSON.parse(await readFile(join(f.staging,'identity.json')));
  assert.equal(identity.validatedRecords,8); assert.equal(identity.head,head); assert.equal(identity.sourceIdentity.length,sourceFiles.length);
  const sums = (await readFile(join(f.staging,'SHA256SUMS.txt'),'utf8')).trim().split('\n');
  assert.equal(sums.length,27);
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
async function setFixtureCoverage(f, language, pageHeight, removeUnused=true) {
  for (const variant of variants) {
    const folder=join(f.attempt,variant,scenarios[3]);
    const r=JSON.parse(await readFile(join(folder,'evidence.json')));
    const view=r.stages.find(stage=>stage.language===language); view.coverage=coverage(pageHeight,305,0);
    await writeFile(join(folder,'evidence.json'),JSON.stringify(r));
    if (removeUnused) for (const kind of ['settings-middle','settings-bottom']) {
      if (!view.coverage.frames.some(frame=>frame.kind===kind)) await rm(join(folder,`${language}-${kind}-320-text200.png`));
    }
  }
}
test('collector accepts actual two-frame Chinese/three-frame English coverage with fourteen PNGs and absent unused slots',async t=>{
  const f=await fixture(t); await setFixtureCoverage(f,'zh-CN',1589);
  const result=await collectEvidence(f); assert.equal(result.ok,true,JSON.stringify(result.errors));
  const actual=await files(f.staging); assert.equal(actual.filter(path=>path.endsWith('.png')).length,14);
  assert.ok(!actual.some(path=>path.endsWith('zh-CN-settings-middle-320-text200.png')));
  assert.equal(JSON.parse(await readFile(join(f.staging,'identity.json'))).successful,true);
});
test('collector accepts one-frame pages without either unused additional slot, retaining all original eight PNGs',async t=>{
  const f=await fixture(t); for (const language of ['zh-CN','en']) await setFixtureCoverage(f,language,900);
  const result=await collectEvidence(f); assert.equal(result.ok,true,JSON.stringify(result.errors));
  assert.equal((await files(f.staging)).filter(path=>path.endsWith('.png')).length,8);
});
test('collector preserves but rejects present stale middle frames unused by real two-frame coverage',async t=>{
  const f=await fixture(t); await setFixtureCoverage(f,'zh-CN',1589,false);
  const result=await collectEvidence(f); assert.equal(result.ok,false);
  assert.equal(result.errors.filter(error=>error.includes('UNUSED_SETTINGS_VIEWPORT_FRAME')).length,2);
  assert.ok((await files(f.staging)).includes(`source/${scenarios[3]}/zh-CN-settings-middle-320-text200.png`));
});
test('collector rejects all unused extra slots even when their count remains within the sixteen PNG cap',async t=>{
  const f=await fixture(t); for (const language of ['zh-CN','en']) await setFixtureCoverage(f,language,900,false);
  const result=await collectEvidence(f); assert.equal(result.ok,false);
  assert.equal(result.errors.filter(error=>error.includes('UNUSED_SETTINGS_VIEWPORT_FRAME')).length,8);
});
for (const variant of variants) for (const language of ['zh-CN','en']) for (const kind of ['settings-middle','settings-bottom'])
  test(`collector requires planned ${variant}/${language}/${kind} frame`,async t=>{
    const f=await fixture(t), path=`${variant}/${scenarios[3]}/${language}-${kind}-320-text200.png`;
    await rm(join(f.attempt,path)); const result=await collectEvidence(f);
    assert.equal(result.ok,false); assert.ok(result.errors.some(error=>error.startsWith(path+':')));
  });
for (const [name,width,height] of [['short viewport',320,899],['tall viewport',320,901],['full page',320,2135],
  ['narrow content crop',305,900],['double scale',640,1800],['zero height',320,0],['over-limit height',320,32769]])
  test('collector rejects '+name+' bytes even when metadata claims exact viewport geometry',async t=>{
    const f=await fixture(t), path=`source/${scenarios[3]}/en-settings-middle-320-text200.png`, wrong=Buffer.from(png);
    wrong.writeUInt32BE(width,16); wrong.writeUInt32BE(height,20); await writeFile(join(f.attempt,path),wrong);
    const result=await collectEvidence(f); assert.equal(result.ok,false);
    assert.ok(result.errors.includes(path+':INVALID_PNG')); assert.ok(!(await files(f.staging)).includes(path));
  });
test('collector cannot substitute a bounded diagnostic failure PNG for missing required viewport bytes',async t=>{
  const f=await fixture(t), folder=join(f.attempt,'source',scenarios[3]), diagnostic=Buffer.from(png);
  diagnostic.writeUInt32BE(1280,16); diagnostic.writeUInt32BE(32768,20);
  await writeFile(join(folder,'failure.png'),diagnostic); await rm(join(folder,'en-settings-bottom-320-text200.png'));
  const result=await collectEvidence(f); assert.equal(result.ok,false);
  assert.ok((await files(f.staging)).includes(`source/${scenarios[3]}/failure.png`));
  assert.ok(result.errors.some(error=>error.includes('en-settings-bottom-320-text200.png:')));
});
test('collector rejects oversize viewport files before reading/staging and retains bounded sibling evidence',async t=>{
  const f=await fixture(t), path=`source/${scenarios[3]}/en-settings-bottom-320-text200.png`;
  await truncate(join(f.attempt,path),20*1024*1024+1);
  const result=await collectEvidence(f); assert.equal(result.ok,false);
  assert.ok(result.errors.includes(path+':NON_REGULAR_OR_OVERSIZE_EVIDENCE'));
  const actual=await files(f.staging); assert.ok(!actual.includes(path));
  assert.ok(actual.includes(`source/${scenarios[3]}/en-settings-320-text200.png`));
});
test('collector refuses unknown or over-capacity coverage before JSON staging while preserving other safe evidence',async t=>{
  const f=await fixture(t), path=`source/${scenarios[3]}/evidence.json`;
  const r=record('source',scenarios[3],f.source); r.stages[1].coverage.pageHeight=2445;
  await writeFile(join(f.attempt,path),JSON.stringify(r)); const result=await collectEvidence(f);
  assert.equal(result.ok,false); assert.ok(result.errors.some(error=>error.includes('SETTINGS_VIEWPORT_FRAME_CAPACITY')));
  const actual=await files(f.staging); assert.ok(!actual.includes(path)); assert.ok(actual.includes('native.tap'));
  assert.ok(actual.includes(`release/${scenarios[3]}/evidence.json`));
});
for (const pageHeight of [500,899]) test(`collector refuses tampered page height ${pageHeight} below the viewport before JSON staging`,async t=>{
  const f=await fixture(t), path=`source/${scenarios[3]}/evidence.json`;
  const r=record('source',scenarios[3],f.source); r.stages[1].coverage=coverage(pageHeight,305,0);
  await writeFile(join(f.attempt,path),JSON.stringify(r)); const result=await collectEvidence(f);
  assert.equal(result.ok,false); assert.ok(result.errors.includes(path.replace('/evidence.json','')+':INVALID_SETTINGS_PAGE_HEIGHT'));
  const actual=await files(f.staging); assert.ok(!actual.includes(path));
  assert.ok(actual.includes(`release/${scenarios[3]}/evidence.json`));
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
const maintenanceUnionBranches = ['codex/maintenance-promotion-current-20261019',
  'codex/context-back-sync-capacity-20261020','codex/maintenance-purpose-settings-20261020','main'];
const maintenanceUnionGuard = branches => "github.repository == 'haohongfei2001-png/paia' && github.event.repository.private == false && ("
  + branches.map(branch=>`github.ref == 'refs/heads/${branch}'`).join(' || ') + ')';
function assertMaintenanceWorkflowUnion(workflow) {
  const start=workflow.indexOf('  original-source-clients:');
  const end=workflow.indexOf('\n\n  # Required supplemental Settings gate.');
  assert.ok(start>0 && end>start);
  // Normalize only the two explicitly approved branch additions, and only in
  // the original two jobs. Every other original job byte keeps its old hash.
  const originalJobs=workflow.slice(start,end)
    .replaceAll(" || github.ref == 'refs/heads/codex/context-back-sync-capacity-20261020'",'')
    .replaceAll(" || github.ref == 'refs/heads/codex/maintenance-purpose-settings-20261020'",'')
    .replace('Validate all 53 roots','Validate all 52 roots');
  assert.equal(hash(originalJobs),'8989b881be1c2839b8fb5a501fcf4541a2df15ae61250446036c6a87e2b4ba88');
  const pushBranches="["+maintenanceUnionBranches.map(branch=>`'${branch}'`).join(', ')+"]";
  assert.deepEqual([...workflow.matchAll(/^    branches: (.+)$/gm)].map(match=>match[1]),[pushBranches]);
  assert.ok(workflow.includes('on:\n  push:\n    branches: '+pushBranches+'\n'),'exact four-branch push union');
  assert.deepEqual([...workflow.matchAll(/^    if: (.+)$/gm)].map(match=>match[1]),[
    maintenanceUnionGuard(maintenanceUnionBranches),maintenanceUnionGuard(maintenanceUnionBranches),
    maintenanceUnionGuard(maintenanceUnionBranches.filter(branch=>branch!=='codex/context-back-sync-capacity-20261020')),
  ],'only the original two jobs gain Nav; the Settings third-job guard remains unchanged');
  assert.equal((workflow.match(/github\.ref == 'refs\/heads\/codex\/context-back-sync-capacity-20261020'/g)||[]).length,2);
  assert.equal((workflow.match(/github\.ref == 'refs\/heads\/codex\/maintenance-purpose-settings-20261020'/g)||[]).length,3);
  return {start,end};
}
test('supplement preserves both original jobs and uses bounded explicit eight-scenario evidence', async () => {
  const workflow=await readFile(new URL('../../.github/workflows/paia-maintenance-promotion-evidence.yml',import.meta.url),'utf8');
  const {end}=assertMaintenanceWorkflowUnion(workflow);
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
  assert.deepEqual(uploaded,artifactPaths()); assert.equal(uploaded.length,36);
  assert.equal(uploaded.filter(path=>path.endsWith('-320-text200.png')).length,16);
  assert.ok(uploaded.every(path=>!path.includes('*')&&!path.includes('..')));
});
for (const [name,alter] of [
  ...['codex/context-back-sync-capacity-20261020','codex/maintenance-purpose-settings-20261020'].flatMap(branch=>[
    [`missing ${branch} push branch`,workflow=>workflow.replace(`'${branch}', `,'')],
    [`missing ${branch} original-job guard`,workflow=>workflow.replace(` || github.ref == 'refs/heads/${branch}'`,'')],
    [`missing all ${branch} guards`,workflow=>workflow.replaceAll(` || github.ref == 'refs/heads/${branch}'`,'')],
  ]),
  ['unknown extra push branch',workflow=>workflow.replace("'main']","'unapproved-branch', 'main']")],
  ['duplicate approved push branch',workflow=>workflow.replace("'main']","'main', 'main']")],
  ['unknown original-job OR',workflow=>workflow.replace(" || github.ref == 'refs/heads/main')"," || github.ref == 'refs/heads/unapproved-branch' || github.ref == 'refs/heads/main')")],
  ['duplicate approved original-job OR',workflow=>workflow.replace(" || github.ref == 'refs/heads/main')"," || github.ref == 'refs/heads/codex/context-back-sync-capacity-20261020' || github.ref == 'refs/heads/main')")],
  ['original repository guard weakened to OR',workflow=>workflow.replace("/paia' && github.event.repository.private", "/paia' || github.event.repository.private")],
  ['original private-repository guard inverted',workflow=>workflow.replace('github.event.repository.private == false','github.event.repository.private == true')],
  ['original branch guard weakened to OR',workflow=>workflow.replace("private == false && (github.ref", "private == false || (github.ref")],
  ['original source-job time limit changed',workflow=>workflow.replace('timeout-minutes: 12','timeout-minutes: 13')],
  ['original native-job time limit changed',workflow=>workflow.replace(/(  original-native-maintenance:[\s\S]*?timeout-minutes: )12/,(_,prefix)=>prefix+'13')],
  ['Settings guard loses its own branch',workflow=>workflow.replace(/(  native-maintenance-purpose-settings:[\s\S]*?) \|\| github.ref == 'refs\/heads\/codex\/maintenance-purpose-settings-20261020'/,'$1')],
  ['Settings guard gains the Nav branch',workflow=>workflow.replace(/(  native-maintenance-purpose-settings:[\s\S]*?)( \|\| github.ref == 'refs\/heads\/main')/,
    "$1 || github.ref == 'refs/heads/codex/context-back-sync-capacity-20261020'$2")],
  ['Settings guard weakens repository privacy',workflow=>workflow.replace(/(  native-maintenance-purpose-settings:[\s\S]*?)github.event.repository.private == false/,'$1github.event.repository.private != true')],
]) test('precise maintenance workflow union rejects '+name,async()=>{
  const workflow=await readFile(new URL('../../.github/workflows/paia-maintenance-promotion-evidence.yml',import.meta.url),'utf8');
  const altered=alter(workflow); assert.notEqual(altered,workflow,'negative fixture must actually change the workflow');
  assert.throws(()=>assertMaintenanceWorkflowUnion(altered));
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


// Execute the actual native viewport helper in a deterministic VM. These
// synthetic PNG headers check capture/control contracts only, never image
// decoding, browser execution, or production visual qualification.
const viewportHelperText=await readFile(new URL('./settings-maintenance-chrome-e2e.test.mjs',import.meta.url),'utf8');
const viewportHelperSource=viewportHelperText.match(/^async function captureSettingsViewportFrames\(page,directory,language\) \{[\s\S]*?^\}\n/m)?.[0];
assert.ok(viewportHelperSource,'execute the exact current native capture helper, not a parallel capture implementation');
const viewportHelperClone=x=>structuredClone(x);
function viewportHelperPng(width=320,height=900){const b=Buffer.alloc(33);Buffer.from([137,80,78,71,13,10,26,10]).copy(b);b.writeUInt32BE(13,8);b.write('IHDR',12);b.writeUInt32BE(width,16);b.writeUInt32BE(height,20);return b;}
function viewportHelperFixture(o={}){
 const height=o.height??2135, width=o.width??305, initial=o.scroll??618;
 const scope={Buffer,assert,join,console:{log(){}},planSettingsViewportFrames,innerWidth:320,innerHeight:900,
 devicePixelRatio:1,visualViewport:{scale:1},scrollX:0,scrollY:initial,requestAnimationFrame(resolve){resolve();},...o.scope};
 const node=(root)=>({clientWidth:width,scrollWidth:width,offsetWidth:width,clientHeight:root?900:height,
 scrollHeight:height,offsetHeight:height,getBoundingClientRect(){return {x:0,y:-scope.scrollY,width,height};}});
 scope.document={fonts:{ready:Promise.resolve()},documentElement:node(true),body:node(false)};
 o.mutate?.(scope);
 const calls=[],screens=[],scrolls=[];let detached=0,attached=0,evaluations=0;
 const metrics=o.metrics??{cssContentSize:{x:0,y:0,width,height},cssVisualViewport:{scale:1}};
 const session={async send(method,params){calls.push({method,params});assert.equal(method,'Page.getLayoutMetrics','no beyondViewport capture or emulation is allowed');if(o.metricsError)throw Error('metrics failed');return metrics;},async detach(){detached++;if(o.detachError)throw Error('detach failed');}};
 scope.scrollTo=(x,y)=>{scrolls.push([x,y]);if(o.restoreError&&screens.length&&y===initial)throw Error('restore failed');scope.scrollX=x;const reached=Math.max(0,Math.min(y,Math.max(0,height-900)+(o.maxScrollExtra??0)));scope.scrollY=o.clamp?Math.max(0,reached-1):reached;o.onScroll?.(scope,y,screens.length);};
 const capture=runInNewContext(viewportHelperSource+'\ncaptureSettingsViewportFrames',scope);
 const page={async evaluate(fn,arg){evaluations++;return fn(arg);},context(){return {async newCDPSession(received){assert.equal(received,page);attached++;return session;}};},
 async screenshot(options){screens.push({options:viewportHelperClone(options),scrollY:scope.scrollY});o.afterScreenshot?.(scope,screens.length);if(o.screenshotError)throw Error('native screenshot failed');return o.png??viewportHelperPng();},
 setViewportSize(){throw Error('viewport mutation forbidden');},addStyleTag(){throw Error('style mutation forbidden');}};
 return {capture:()=>capture(page,'expected-directory','en'),calls,screens,scrolls,scope,counts:()=>({attached,detached,evaluations})};
}
for(const [name,height,scroll] of [['one',900,0],['two',1589,618],['three',2135,918]])test('exact native viewport helper: exact helper captures '+name+' raw original320x900 frame(s), actual complete plan, and restores scroll',async()=>{
 const f=viewportHelperFixture({height,scroll});const coverage=await f.capture(), plan=planSettingsViewportFrames(height,900);
 assert.deepEqual(JSON.parse(JSON.stringify(coverage)),{viewportWidth:320,viewportHeight:900,contentWidth:305,gutterWidth:15,pageHeight:height,dpr:1,scale:1,originalScrollY:scroll,restoredScrollY:scroll,frames:plan.map(x=>({...x,pngWidth:320,pngHeight:900}))});
 assert.deepEqual(f.calls,[{method:'Page.getLayoutMetrics',params:undefined}]);assert.equal(f.counts().attached,1);assert.equal(f.counts().detached,1);
 assert.deepEqual(f.screens,plan.map(frame=>({options:{path:join('expected-directory','en-'+frame.kind+'-320-text200.png'),fullPage:false,caret:'initial'},scrollY:frame.scrollY})));
 assert.deepEqual(f.scrolls,[...plan.map((x,i)=>[0,i===plan.length-1?height+900:x.scrollY]),[0,scroll]]);assert.equal(f.scope.scrollY,scroll);
});
test('exact native viewport helper: overlay scrollbar uses actual320 content width and zero gutter without a fabricated15px bar',async()=>{const f=viewportHelperFixture({width:320});const c=await f.capture();assert.equal(c.contentWidth,320);assert.equal(c.gutterWidth,0);});
for(const [name,o] of [
 ['wrong320 viewport',{scope:{innerWidth:305}}],['wrong900 viewport',{scope:{innerHeight:899}}],['DPR resize',{scope:{devicePixelRatio:2}}],
 ['visual scale',{scope:{visualViewport:{scale:1.2}}}],['horizontal scroll',{scope:{scrollX:1}}],['nonfinite viewport',{scope:{scrollY:NaN}}],['negative scroll',{scroll:-1}],
 ['root overflow',{mutate:s=>s.document.documentElement.scrollWidth=321}],['body overflow',{mutate:s=>s.document.body.getBoundingClientRect=()=>({x:0,y:0,width:321,height:2135})}],
 ['negative content',{mutate:s=>s.document.body.scrollHeight=-1}],['nonfinite content',{mutate:s=>s.document.body.getBoundingClientRect=()=>({x:0,y:0,width:305,height:NaN})}],
])test('exact native viewport helper: refuses '+name+' before attaching or changing scroll',async()=>{const f=viewportHelperFixture(o);await assert.rejects(f.capture());assert.equal(f.calls.length,0);assert.equal(f.screens.length,0);assert.equal(f.scrolls.length,0);assert.equal(f.counts().attached,0);});
for(const [name,o] of [
 ['unboundedheight',{height:32769}],['overcapacity',{height:2445}],['fractionalheight',{height:2135.5}],['old scroll outside content',{scroll:1236}],
 ['native mismatch',{metrics:{cssContentSize:{x:0,y:0,width:306,height:2135},cssVisualViewport:{scale:1}}}],
 ['native offset',{metrics:{cssContentSize:{x:1,y:0,width:305,height:2135},cssVisualViewport:{scale:1}}}],
 ['missing native height',{metrics:{cssContentSize:{x:0,y:0,width:305},cssVisualViewport:{scale:1}}}],
 ['zero nativeheight',{metrics:{cssContentSize:{x:0,y:0,width:305,height:0},cssVisualViewport:{scale:1}}}],
 ['negative nativeheight',{metrics:{cssContentSize:{x:0,y:0,width:305,height:-1},cssVisualViewport:{scale:1}}}],
 ['fractional lower nativeheight',{metrics:{cssContentSize:{x:0,y:0,width:305,height:2000.5},cssVisualViewport:{scale:1}}}],
 ['native visualscale',{metrics:{cssContentSize:{x:0,y:0,width:305,height:2135},cssVisualViewport:{scale:2}}}],
 ['missing native metrics',{metrics:{cssVisualViewport:{scale:1}}}],
 ['metrics failure',{metricsError:true}],['detach failure',{detachError:true}],
])test('exact native viewport helper: refuses '+name+' before capturing and detaches original session',async()=>{const f=viewportHelperFixture(o);await assert.rejects(f.capture());assert.equal(f.screens.length,0);assert.equal(f.scrolls.length,0);assert.equal(f.counts().detached,1);});
for(const [name,o] of [
 ['305px output',{png:viewportHelperPng(305)}],['truncated height',{png:viewportHelperPng(320,899)}],['bad signature',{png:Buffer.alloc(33)}],['short header',{png:Buffer.alloc(23)}],
 ['actual scroll mismatch',{clamp:true}],['actual reachable bottom mismatch',{maxScrollExtra:1}],['scroll layout drift',{onScroll:(s,y)=>{if(y===0)s.document.body.clientWidth=304;}}],
 ['capture scroll drift',{afterScreenshot:s=>s.scrollY++}],['capture viewport drift',{afterScreenshot:s=>s.innerWidth=321}],
 ['capture scrollbar drift',{afterScreenshot:s=>s.document.documentElement.clientWidth=320}],['native capture rejection',{screenshotError:true}],
])test('exact native viewport helper: refuses '+name+' and attempts original scroll restoration without later frame',async()=>{const f=viewportHelperFixture(o);await assert.rejects(f.capture());assert.equal(f.screens.length<=(o.maxScrollExtra?2:1),true);assert.deepEqual(f.scrolls.at(-1),[0,618]);assert.equal(f.counts().detached,1);});
test('exact native viewport helper: restore failure rejects otherwise complete capture and cannot produce successful coverage',async()=>{const f=viewportHelperFixture({restoreError:true});await assert.rejects(f.capture(),/restore failed/);assert.equal(f.screens.length,3);assert.deepEqual(f.scrolls.at(-1),[0,618]);});
test('exact native viewport helper: restore failure after capture failure does not hide the primary failing capture',async()=>{const f=viewportHelperFixture({restoreError:true,screenshotError:true});await assert.rejects(f.capture(),/native screenshot failed/);assert.equal(f.screens.length,1);assert.deepEqual(f.scrolls.at(-1),[0,618]);});
test('exact native viewport helper: native helper never requests whole-document capture, emulation, cropping, padding, resizing or style changes',()=>{
 for(const forbidden of ['Page.captureScreenshot','captureBeyondViewport','setDeviceMetricsOverride','setViewportSize','addStyleTag','clip:','fullPage:true','writeFile('])assert.equal(viewportHelperSource.includes(forbidden),false,forbidden);
 assert.match(viewportHelperSource,/fullPage:false,caret:'initial'/);assert.match(viewportHelperSource,/assert\.deepEqual\(after,first/);assert.match(viewportHelperSource,/assert\.deepEqual\(restored,before/);
});
