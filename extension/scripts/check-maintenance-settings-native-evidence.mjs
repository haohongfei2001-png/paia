import {readFile, writeFile, mkdir, readdir, lstat} from 'node:fs/promises';
import {resolve, join, basename, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

export const scenarios = Object.freeze(['trusted-confirmation-and-peers', 'native-write-failure-and-lost-reply',
  'actual-worker-and-browser-reconstruction', 'compact-bilingual-keyboard']);
export const variants = Object.freeze(['source', 'release']);
const languages = ['zh-CN', 'en'];
const compactImageKinds = ['dialog', 'settings', 'settings-middle', 'settings-bottom'];
const states = ['on', 'off', 'off_unconfirmed', 'save_unknown', 'saving', 'unavailable'];
const stages = [
  ['fresh-default-off', 'one-trusted-on-ack', 'peer-off-ack', 'stale-dialog-denied', 'actual-page-reload-retains-on'],
  ['fresh-default-off', 'exact-native-put-failed', 'one-explicit-off-retry-committed', 'actual-success-before-delivery-loss'],
  ['fresh-default-off', 'native-worker-stopped-and-fresh-heap-on', 'actual-browser-process-reopened-on',
    'off-failure-warning-before-worker-loss', 'unpersisted-off-boundary-observed', 'actual-browser-process-reopened-off'],
  ['fresh-default-off', 'native-compact-keyboard', 'native-compact-keyboard'],
];
const fail = reason => { throw Error(reason); };
const exact = (value, expected, reason) => {
  if (JSON.stringify(value) !== JSON.stringify(expected)) fail(reason);
};
const digest = data => createHash('sha256').update(data).digest('hex');
export const sourceFiles = Object.freeze(['manifest.json', 'package.json',
  'tests/settings-maintenance-chrome-e2e.test.mjs', 'tests/harness/fake-chatgpt.mjs',
  'tests/harness/settings-consumer-presentation.mjs', 'scripts/build_current_release.py',
  'scripts/check-hosted-chrome.mjs',
  'scripts/check-maintenance-settings-native-evidence.mjs', 'background/service-worker.js',
  'background/maintenance-processing-commands.js', 'background/maintenance-processing-consent.js',
  'ui/settings-maintenance.js', 'ui/settings-maintenance-state.js', 'ui/settings-preferences.js']);
function plain(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function keys(value, allowed, required = allowed) {
  if (!plain(value) || Object.keys(value).some(key => !allowed.includes(key))
    || required.some(key => !Object.hasOwn(value, key))) fail('UNEXPECTED_EVIDENCE_FIELDS');
}

// Raw viewport frames preserve the real scrollbar/layout. Plan before capture
// and fail closed if the fixed three-frame budget cannot include the bottom.
export function planSettingsViewportFrames(pageHeight, viewportHeight) {
  if (!Number.isSafeInteger(pageHeight) || pageHeight <= 0 || pageHeight > 32768
    || !Number.isSafeInteger(viewportHeight) || viewportHeight <= 128) fail('INVALID_SETTINGS_VIEWPORT_HEIGHTS');
  const offsets = [0], overlap = 128, maxFrames = 3;
  while (offsets.at(-1) + viewportHeight < pageHeight) {
    if (offsets.length === maxFrames) fail('SETTINGS_VIEWPORT_FRAME_CAPACITY');
    offsets.push(Math.min(offsets.at(-1) + viewportHeight - overlap, Math.max(0, pageHeight - viewportHeight)));
  }
  return offsets.map((scrollY, index) => ({
    kind:index === 0 ? 'settings' : index === offsets.length - 1 ? 'settings-bottom' : 'settings-middle', scrollY,
  }));
}

function validateCoverage(value) {
  keys(value, ['viewportWidth','viewportHeight','contentWidth','gutterWidth','pageHeight','dpr','scale',
    'originalScrollY','restoredScrollY','frames']);
  if (value.viewportWidth !== 320 || value.viewportHeight !== 900 || value.dpr !== 1 || value.scale !== 1
    || !Number.isFinite(value.contentWidth) || value.contentWidth <= 0 || value.contentWidth > 320
    || !Number.isFinite(value.gutterWidth) || value.gutterWidth !== 320 - value.contentWidth) fail('INVALID_SETTINGS_VIEWPORT_GEOMETRY');
  const plan = planSettingsViewportFrames(value.pageHeight, value.viewportHeight);
  if (value.pageHeight < value.viewportHeight) fail('INVALID_SETTINGS_PAGE_HEIGHT');
  const maxScroll = Math.max(0, value.pageHeight - value.viewportHeight);
  if (!Number.isFinite(value.originalScrollY) || value.originalScrollY < 0 || value.originalScrollY > maxScroll
    || !Number.isFinite(value.restoredScrollY) || value.restoredScrollY < 0 || value.restoredScrollY > maxScroll
    || value.originalScrollY !== value.restoredScrollY) fail('SETTINGS_VIEWPORT_SCROLL_NOT_RESTORED');
  if (!Array.isArray(value.frames) || value.frames.length !== plan.length) fail('INCOMPLETE_SETTINGS_VIEWPORT_FRAMES');
  for (const frame of value.frames) {
    keys(frame, ['kind','scrollY','pngWidth','pngHeight']);
    if (frame.pngWidth !== 320 || frame.pngHeight !== 900) fail('INVALID_SETTINGS_VIEWPORT_PNG_GEOMETRY');
  }
  exact(value.frames.map(({kind,scrollY}) => ({kind,scrollY})), plan, 'SETTINGS_VIEWPORT_FRAME_PLAN_MISMATCH');
  return true;
}

export function validateEnvironment(value, head) {
  keys(value, ['head','node','chrome','glyphPreflight','fonts','families']);
  if (value.head !== head || typeof value.node !== 'string' || !/^v22\./.test(value.node)
    || typeof value.chrome !== 'string' || value.chrome.length > 256 || !/Chrome \d/.test(value.chrome)
    || typeof value.glyphPreflight !== 'string' || !/^HOSTED_CHROME_LAUNCH_PASS \d+(?:\.\d+){3}$/.test(value.glyphPreflight)
    || !Array.isArray(value.fonts) || value.fonts.length !== 2
    || !Array.isArray(value.families) || value.families.length !== 3) fail('INVALID_NATIVE_ENVIRONMENT');
  exact(value.fonts.map(row => row.name), ['fonts-wqy-zenhei','fonts-noto-cjk'], 'FONT_PACKAGES_INCOMPLETE');
  for (const row of value.fonts) {
    keys(row, ['name','version']);
    if (typeof row.version !== 'string' || !/^[a-zA-Z0-9.+~:-]{1,128}$/.test(row.version)) fail('INVALID_FONT_VERSION');
  }
  exact(value.families.map(row => row.requested), ['Noto Serif CJK SC','Noto Sans CJK SC','WenQuanYi Zen Hei'], 'FONT_FAMILIES_INCOMPLETE');
  for (const row of value.families) {
    keys(row, ['requested','matched']);
    if (typeof row.matched !== 'string' || row.matched.length > 512 || !row.matched.includes(row.requested)) fail('FONT_FAMILY_NOT_INSTALLED');
  }
  return true;
}

export function validateTap(tap, exit) {
  if (exit.trim() !== '0') fail('NATIVE_PROCESS_NOT_SUCCESSFUL');
  for (const [key, value] of Object.entries({tests:8, pass:8, fail:0, cancelled:0, skipped:0, todo:0})) {
    const matches = [...tap.matchAll(new RegExp('^# ' + key + ' (\\d+)$', 'gm'))];
    if (matches.length !== 1 || Number(matches[0][1]) !== value) fail('NATIVE_TAP_' + key.toUpperCase());
  }
  const leaves = [...tap.matchAll(/^ok (\d+) - Maintenance Settings native (.+)$/gm)];
  exact(leaves.map(match => Number(match[1])), [1,2,3,4,5,6,7,8], 'NATIVE_LEAF_IDENTITIES');
  exact(leaves.map(match => match[2]), variants.flatMap(variant => scenarios.map(scenario => `${scenario} (${variant})`)),
    'NATIVE_LEAF_NAMES');
  if (/recursive/i.test(tap) || /^(?:not ok \d+ -|ok \d+ -.* # (?:SKIP|TODO)\b)/im.test(tap)) fail('NATIVE_PARTIAL_OR_RECURSIVE_RUN');
  exact([...tap.matchAll(/^1\.\.(\d+)$/gm)].map(match => Number(match[1])), [8], 'NATIVE_TAP_PLAN');
  return true;
}

// Structural validation also governs which JSON records may enter the artifact.
// It accepts incomplete failure records for diagnosis, never as successful proof.
export function validateRecordShape(value) {
  keys(value, ['variant','scenario','extensionPath','sourceRoot','node','requestedHead','stages','scenarioCompleted',
    'browser','manifestSha256','manifestVersion','failure','screenshotError','cleanupFailure'],
  ['variant','scenario','extensionPath','sourceRoot','node','requestedHead','stages','scenarioCompleted']);
  for (const name of ['variant','scenario','extensionPath','sourceRoot','node']) {
    if (typeof value[name] !== 'string' || value[name].length > 4096) fail('INVALID_RECORD_SCALAR');
  }
  if (value.requestedHead !== null && (typeof value.requestedHead !== 'string'
    || !/^[0-9a-f]{40}$/.test(value.requestedHead))) fail('INVALID_HEAD_RECORD');
  for (const name of ['browser','manifestSha256','manifestVersion','screenshotError','cleanupFailure']) {
    if (value[name] !== undefined && (typeof value[name] !== 'string' || value[name].length > 4096)) fail('INVALID_RECORD_SCALAR');
  }
  if (!variants.includes(value.variant) || !scenarios.includes(value.scenario)
    || typeof value.scenarioCompleted !== 'boolean' || !Array.isArray(value.stages) || value.stages.length > 16) fail('INVALID_RECORD');
  if (value.failure !== undefined) {
    keys(value.failure, ['name','message','stack'], ['name','message']);
    for (const text of Object.values(value.failure)) if (typeof text !== 'string' || text.length > 32768) fail('INVALID_FAILURE_RECORD');
  }
  for (const entry of value.stages) {
    keys(entry, ['stage','state','language','geometry','writes','coverage'], ['stage']);
    if (typeof entry.stage !== 'string' || !stages.flat().includes(entry.stage)) fail('INVALID_STAGE');
    if (entry.state !== undefined) {
      keys(entry.state, ['enabled','savedEnabled','generation','phase','serviceAvailable']);
      if (typeof entry.state.enabled !== 'boolean' || typeof entry.state.savedEnabled !== 'boolean'
        || typeof entry.state.generation !== 'string' || entry.state.generation.length > 512
        || !states.includes(entry.state.phase) || entry.state.serviceAvailable !== false) fail('INVALID_PURPOSE_STATE');
    }
    if (entry.language !== undefined && !languages.includes(entry.language)) fail('INVALID_LANGUAGE');
    if (entry.geometry !== undefined) {
      keys(entry.geometry, ['x','right','width','overflow','pageOverflow']);
      if (Object.values(entry.geometry).some(number => !Number.isFinite(number))) fail('INVALID_GEOMETRY');
    }
    if (entry.writes !== undefined && (!Array.isArray(entry.writes) || entry.writes.length > 2
      || entry.writes.some(item => typeof item !== 'boolean'))) fail('INVALID_WRITE_OBSERVATION');
    if (entry.coverage !== undefined) {
      if (entry.stage !== 'native-compact-keyboard') fail('UNEXPECTED_SETTINGS_VIEWPORT_COVERAGE');
      validateCoverage(entry.coverage);
    }
  }
  return true;
}

export function validateRecord(value, {variant, scenario, source, head, manifestHash, version}) {
  validateRecordShape(value);
  if (value.variant !== variant || value.scenario !== scenario || value.requestedHead !== head
    || resolve(value.sourceRoot) !== resolve(source) || !/^v22\./.test(value.node)) fail('NATIVE_RECORD_IDENTITY');
  if (value.scenarioCompleted !== true || value.failure || value.cleanupFailure || value.screenshotError) fail('NATIVE_RECORD_FAILED');
  if (typeof value.browser !== 'string' || !value.browser || !/^[0-9a-f]{64}$/.test(value.manifestSha256)
    || value.manifestVersion !== version) fail('NATIVE_RUNTIME_IDENTITY');
  if (variant === 'source') {
    if (resolve(value.extensionPath) !== resolve(source) || value.manifestSha256 !== manifestHash) fail('SOURCE_PATH_NOT_ACTUAL');
  } else if (resolve(value.extensionPath) === resolve(source)
    || !basename(value.extensionPath).startsWith('paia-maintenance-settings-release-')) fail('RELEASE_PATH_NOT_BUILT');
  exact(value.stages.map(entry => entry.stage), stages[scenarios.indexOf(scenario)], 'NATIVE_STAGES_INCOMPLETE');
  const state = name => value.stages.find(entry => entry.stage === name)?.state;
  const checkState = (name, enabled, savedEnabled, phase) => {
    const current = state(name);
    if (!current || current.enabled !== enabled || current.savedEnabled !== savedEnabled || current.phase !== phase) fail('NATIVE_STAGE_STATE_' + name);
  };
  checkState('fresh-default-off', false, false, 'off');
  if (scenario === scenarios[0]) {
    checkState('one-trusted-on-ack', true, true, 'on');
    checkState('peer-off-ack', false, false, 'off');
  } else if (scenario === scenarios[1]) {
    checkState('exact-native-put-failed', false, true, 'off_unconfirmed');
    checkState('actual-success-before-delivery-loss', true, true, 'on');
  } else if (scenario === scenarios[2]) {
    for (const name of ['native-worker-stopped-and-fresh-heap-on','actual-browser-process-reopened-on','unpersisted-off-boundary-observed']) checkState(name, true, true, 'on');
    checkState('actual-browser-process-reopened-off', false, false, 'off');
    if (state('native-worker-stopped-and-fresh-heap-on').generation === state('actual-browser-process-reopened-on').generation) fail('RECONSTRUCTION_GENERATION_REUSED');
  } else {
    const views = value.stages.slice(1);
    exact(views.map(view => view.language), languages, 'NATIVE_LANGUAGES_INCOMPLETE');
    for (const view of views) {
      exact(view.writes, [true,false], 'NATIVE_KEYBOARD_WRITE_SEQUENCE');
      const g = view.geometry;
      if (!g || g.x < 0 || g.right > 320 || g.width <= 0 || g.overflow > 2 || g.pageOverflow > 2) fail('NATIVE_LAYOUT_OVERFLOW');
      validateCoverage(view.coverage);
    }
  }
  return true;
}

export function artifactPaths() {
  return ['native.tap','native.exit','identity.json','SHA256SUMS.txt',
    ...variants.flatMap(variant => scenarios.flatMap(scenario => [
      `${variant}/${scenario}/evidence.json`, `${variant}/${scenario}/failure.png`,
      ...(scenario === scenarios[3] ? languages.flatMap(language => compactImageKinds.map(kind =>
        `${variant}/${scenario}/${language}-${kind}-320-text200.png`)) : []),
    ]))];
}

async function regular(path, limit) {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > limit) fail('NON_REGULAR_OR_OVERSIZE_EVIDENCE');
  return readFile(path);
}

async function directory(path) {
  const stat = await lstat(path);
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail('NON_REGULAR_EVIDENCE_DIRECTORY');
}

export async function collectEvidence({input, staging, source, head}) {
  if (!/^[a-f0-9]{40}$/.test(head)) fail('EXACT_HEAD_REQUIRED');
  input = resolve(input); staging = resolve(staging); source = resolve(source);
  if (input === staging || staging.startsWith(input + '/') || input.startsWith(staging + '/')) fail('SEPARATE_STAGING_REQUIRED');
  await mkdir(staging); // Fresh staging only; never mix a previous run into proof.
  const errors = [], entries = [], records = [];
  await directory(input);
  const save = async (path, bytes) => {
    if (!artifactPaths().includes(path)) fail('ARTIFACT_NOT_ALLOWLISTED');
    const target = join(staging, path); await mkdir(dirname(target), {recursive:true});
    await writeFile(target, bytes); entries.push({path, bytes:bytes.length, sha256:digest(bytes)});
  };
  let tap, exit;
  for (const name of ['native.tap','native.exit']) {
    try { const bytes = await regular(join(input, name), 10 * 1024 * 1024); await save(name, bytes);
      if (name === 'native.tap') tap = bytes.toString(); else exit = bytes.toString();
    } catch (error) { errors.push(name + ':' + error.message); }
  }
  try { validateTap(tap || '', exit || 'missing'); } catch (error) { errors.push(error.message); }
  let environment = null;
  try {
    const value = JSON.parse(await regular(join(input, 'environment.json'), 16384));
    validateEnvironment(value, head); environment = value;
  } catch (error) { errors.push('environment:' + error.message); }
  const manifest = await regular(join(source, 'manifest.json'), 1024 * 1024);
  const version = JSON.parse(manifest).version, manifestHash = digest(manifest);
  const sourceIdentity = [];
  for (const path of sourceFiles) {
    try { const bytes = await regular(join(source, path), 10 * 1024 * 1024);
      sourceIdentity.push({path, sha256:digest(bytes), bytes:bytes.length});
    } catch (error) { errors.push(`source/${path}:${error.message}`); }
  }
  const attempts = (await readdir(input, {withFileTypes:true})).filter(entry => entry.name.startsWith('paia-maintenance-settings-evidence-'));
  if (attempts.length !== 1 || !attempts[0].isDirectory() || attempts[0].isSymbolicLink()) errors.push('EXACTLY_ONE_ACTUAL_ATTEMPT_REQUIRED');
  else for (const variant of variants) for (const scenario of scenarios) {
    const folder = join(input, attempts[0].name, variant, scenario);
    // No traversal or recursive copy: only these explicitly named synthetic files.
    try {
      await directory(join(input, attempts[0].name));
      await directory(join(input, attempts[0].name, variant));
      await directory(folder);
    } catch (error) { errors.push(`${variant}/${scenario}:${error.message}`); continue; }
    let record;
    try {
      const bytes = await regular(join(folder, 'evidence.json'), 128 * 1024), value = JSON.parse(bytes);
      validateRecordShape(value);
      await save(`${variant}/${scenario}/evidence.json`, bytes);
      record = value;
      validateRecord(value, {variant, scenario, source, head, manifestHash, version});
      records.push(value);
    } catch (error) { errors.push(`${variant}/${scenario}:${error.message}`); }
    const pngs = scenario === scenarios[3] ? languages.flatMap(language => compactImageKinds.map(kind =>
      `${language}-${kind}-320-text200.png`)) : [];
    const requiredPngs = new Set(scenario === scenarios[3] ? languages.flatMap(language => [
      `${language}-dialog-320-text200.png`, `${language}-settings-320-text200.png`,
      ...(record?.stages.find(entry => entry.stage === 'native-compact-keyboard' && entry.language === language)
        ?.coverage?.frames || []).map(frame => `${language}-${frame.kind}-320-text200.png`),
    ]) : []);
    for (const name of [...pngs, 'failure.png']) {
      try {
        const bytes = await regular(join(folder, name), 20 * 1024 * 1024);
        // Header completeness/dimensions are evidence checks, not a visual
        // verdict. Retrieved screenshots still require decoding and inspection.
        if (bytes.length < 33 || !bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
          || bytes.readUInt32BE(8) !== 13 || bytes.toString('ascii',12,16) !== 'IHDR'
          || bytes.readUInt32BE(16) < 1 || bytes.readUInt32BE(16) > 32768
          || bytes.readUInt32BE(20) < 1 || bytes.readUInt32BE(20) > 32768
          || (name !== 'failure.png' && (bytes.readUInt32BE(16) !== 320 || bytes.readUInt32BE(20) !== 900))) fail('INVALID_PNG');
        await save(`${variant}/${scenario}/${name}`, bytes);
        if (name !== 'failure.png' && !requiredPngs.has(name)) errors.push(`${variant}/${scenario}/${name}:UNUSED_SETTINGS_VIEWPORT_FRAME`);
      } catch (error) { if (requiredPngs.has(name) || error.code !== 'ENOENT') errors.push(`${variant}/${scenario}/${name}:${error.message}`); }
    }
  }
  const releaseHashes = new Set(records.filter(record => record.variant === 'release').map(record => record.manifestSha256));
  if (records.length !== 8 || releaseHashes.size !== 1) errors.push('INCOMPLETE_OR_INCONSISTENT_EIGHT_RECORDS');
  const identity = {head, source, sourceManifestSha256:manifestHash, version, sourceIdentity, environment,
    scope:'synthetic default-null native Settings only; visual inspection remains required',
    expectedLeaves:8, validatedRecords:records.length, successful:errors.length === 0, errors};
  await save('identity.json', Buffer.from(JSON.stringify(identity, null, 2) + '\n'));
  const sums = entries.map(entry => `${entry.sha256}  ${entry.path}`).sort().join('\n') + '\n';
  await writeFile(join(staging, 'SHA256SUMS.txt'), sums);
  return {ok:errors.length === 0, errors, entries};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [input, staging, source, head, ...extra] = process.argv.slice(2);
  if (!input || !staging || !source || !head || extra.length) throw Error('Expected input staging source exact-head');
  const result = await collectEvidence({input, staging, source, head});
  console.log(JSON.stringify({ok:result.ok, errors:result.errors, artifacts:result.entries.length}));
  if (!result.ok) process.exitCode = 1;
}
