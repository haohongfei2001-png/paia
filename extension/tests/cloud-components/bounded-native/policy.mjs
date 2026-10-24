// Preparation only. There is deliberately no native/browser launcher adapter or CLI.
export const SOURCE_COMMIT = '98761c8c627ee66445c20dee452959d644fcd634';
export const SOURCE_TREE = 'b3b243627bf9ff117565d27d646f126a63e6c55b';
export const SOURCE_MANIFEST_SHA256 = '798736cc88a97530c6270c5455b59ff3bd3a0d1cd258a9deee7a418a70c64b2a';
export const FIXTURE_SHA256 = '0b516daf11378ecc98791499e8e7359f96fe56eea6d6eac06aff93e761caa35d';
export const FIXTURE_PATH = 'tests/cloud-components/bounded-native/recovery-saved-fixture.mjs';
export const ORIGIN = 'http://127.0.0.1:31024';
export const VARIANTS = Object.freeze(['Source', 'Release']);
export const TEST_IDS = Object.freeze([
  'RECOVERY_WORK_BUDGET',
  'RECOVERY_NATIVE_ABORT_COLD',
  'SAVED_EMPTY_SEARCH_COLD',
  'SAVED_MISSING_LOCATOR_ABORT',
]);
export const BUDGETS = Object.freeze({buildMs: 30_000, nativeMs: 120_000, jobMs: 300_000});
export const LAUNCH_OPTIONS = Object.freeze({
  headless: true,
  chromiumSandbox: true,
  timeout: 15_000,
  args: Object.freeze([
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-sync',
    '--host-resolver-rules=MAP * ~NOTFOUND',
  ]),
});
export const CONTEXT_OPTIONS = Object.freeze({serviceWorkers: 'block', acceptDownloads: false, offline: true});
export const NOT_READY = Object.freeze([
  'Fresh explicit native execution authorization is absent.',
  'No supervised standard build_current_release.py build or verified Release manifest exists for this preparation.',
  'No real launcher adapter or independently verified Chromium executable is supplied.',
  'OS process-tree termination and outer job/build/native hard deadlines are not proven.',
  'OS-level network deny and native Chromium sandbox availability are not proven.',
]);
export function requireNativeReadiness() {
  const error = new Error('NOT_READY: ' + NOT_READY.join(' '));
  error.code = 'NOT_READY';
  throw error;
}
