import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {SOURCE_COMMIT, SOURCE_TREE, SOURCE_MANIFEST_SHA256, FIXTURE_SHA256, FIXTURE_PATH, VARIANTS} from './policy.mjs';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const verified = new WeakSet();
const hex = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const safePath = value => typeof value === 'string' && !value.includes('\\') && !value.split('/').some(p => !p || p === '.' || p === '..') && !value.startsWith('/');
const keys = object => Object.keys(object).sort();

// Full emitted inventory digest uses the original standard builder's algorithm.
// This checks a receipt's bytes, not its provenance. Only a trusted supervisor can
// establish that those bytes were emitted by the unchanged standard builder.
export function outputFingerprint(files) {
  const hash = createHash('sha256');
  for (const path of keys(files)) {
    assert.ok(safePath(path), 'Unsafe inventory path');
    hash.update(path + '\0').update(files[path]).update('\0');
  }
  return hash.digest('hex');
}

// Immutable byte-snapshot contract. Callers must supply independently read,
// non-symlink files, distinct Source/Release roots, and provenance in a future
// supervised adapter. This preparation intentionally supplies no such adapter.
export function verifyArtifactSnapshots({sourceManifestBytes, sourceFiles, releaseManifest, releaseFiles, fixtureBytes}) {
  assert.equal(sha256(sourceManifestBytes), SOURCE_MANIFEST_SHA256, 'Pinned Source manifest mismatch');
  const source = JSON.parse(Buffer.from(sourceManifestBytes).toString('utf8'));
  assert.equal(source.schema, 1);
  assert.equal(source.variant, 'Source');
  assert.equal(source.sourceCommit, SOURCE_COMMIT);
  assert.equal(source.sourceTree, SOURCE_TREE);
  assert.equal(sha256(fixtureBytes), FIXTURE_SHA256, 'Fixed fixture mismatch');
  assert.deepEqual(keys(sourceFiles), keys(source.files), 'Exact Source file allowlist required');
  for (const [path, digest] of Object.entries(source.files)) {
    assert.ok(safePath(path) && /^(core|background)\/.+\.(m?js)$/.test(path), 'Invalid runtime allowlist path');
    assert.ok(hex(digest));
    assert.equal(sha256(sourceFiles[path]), digest, 'Source hash mismatch: ' + path);
  }
  assert.equal(releaseManifest?.schema, 1, 'Separate Release manifest required');
  assert.equal(releaseManifest.variant, 'Release');
  assert.equal(releaseManifest.sourceCommit, SOURCE_COMMIT, 'Release source commit mismatch');
  assert.equal(releaseManifest.sourceTree, SOURCE_TREE, 'Release source tree mismatch');
  assert.equal(releaseManifest.sourceManifestSha256, SOURCE_MANIFEST_SHA256);
  const build = releaseManifest.build;
  assert.equal(build?.entrypoint, 'scripts/build_current_release.py', 'Original standard builder required');
  assert.deepEqual(build.builderFiles, source.builderFiles, 'Builder/guard hashes changed');
  assert.equal(build.exitCode, 0);
  assert.equal(build.guardrails, 'PASS');
  assert.equal(build.reused, false, 'A future fresh, supervised build is required');
  assert.ok(Number.isFinite(build.elapsedMs) && build.elapsedMs >= 0 && build.elapsedMs <= 30_000, 'Build budget exceeded');
  assert.ok(hex(build.sourceFingerprint));
  assert.ok(hex(build.outputFingerprint));
  assert.ok(['CONTRACT_FIXTURE_NOT_A_BUILD', 'STANDARD_BUILD_RECEIPT_UNVERIFIED'].includes(build.evidenceClass), 'No native evidence class is supported in preparation');
  assert.deepEqual(keys(releaseFiles), keys(releaseManifest.files), 'Exact full Release inventory required');
  for (const [path, digest] of Object.entries(releaseManifest.files)) {
    assert.ok(safePath(path) && hex(digest), 'Invalid Release manifest');
    assert.equal(sha256(releaseFiles[path]), digest, 'Release hash mismatch: ' + path);
  }
  assert.equal(outputFingerprint(releaseFiles), build.outputFingerprint, 'Release output fingerprint mismatch');
  for (const path of keys(source.files)) {
    assert.ok(Object.hasOwn(releaseManifest.files, path), 'Release runtime missing: ' + path);
    // The unchanged standard builder copies these modules verbatim, except its
    // one documented service-worker removal. This is an expectation, not a build.
    let expected = Buffer.from(sourceFiles[path]);
    if (path === 'background/service-worker.js') {
      const removed = "    case 'FILTER_DIAGNOSTICS': return store.filterDiagnostics();\n";
      const text = expected.toString('utf8');
      assert.equal(text.split(removed).length, 2, 'Standard release transform drift');
      expected = Buffer.from(text.replace(removed, ''));
    }
    // Do not ask assert to render a potentially huge byte-array diff on refusal.
    assert.ok(Buffer.from(releaseFiles[path]).equals(expected), 'Release runtime differs from unchanged builder output: ' + path);
  }
  const byVariant = new Map();
  for (const variant of VARIANTS) {
    const files = variant === 'Source' ? sourceFiles : releaseFiles;
    const routes = new Map(keys(source.files).map(path => ['/' + variant + '/' + path, Buffer.from(files[path]).toString('utf8')]));
    routes.set('/' + variant + '/' + FIXTURE_PATH, Buffer.from(fixtureBytes).toString('utf8'));
    byVariant.set(variant, routes);
  }
  const artifact = Object.freeze({
    sourceCommit: SOURCE_COMMIT,
    sourceTree: SOURCE_TREE,
    sourceManifestSha256: SOURCE_MANIFEST_SHA256,
    releaseOutputFingerprint: build.outputFingerprint,
    provenance: 'MANIFEST_BYTES_ONLY_NOT_NATIVE_OR_BUILD_PROOF',
    // Strings are immutable, and the private Maps cannot escape to a caller.
    body(variant, path) { return byVariant.get(variant)?.get(path); },
  });
  verified.add(artifact);
  return artifact;
}
export function requireVerifiedArtifacts(value) {
  assert.ok(verified.has(value), 'Hash-verified immutable manifests required before launch');
}
