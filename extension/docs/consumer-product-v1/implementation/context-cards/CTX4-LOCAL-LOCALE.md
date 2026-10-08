# CTX4 local editable-card locale correction

Base: a733ae58 (Settings0.20 main integration plus receipt). Local candidate only;
no whole CTX4 stage, installed build or 22-state visual certification claim.

The Info/Rules/Now page retained old-language headings and editor labels after a
preference change while open. Three production-page unit cases failed before the
fix (42 existing cases passed), logged at `/tmp/ctx4-locale-before.log`.

The existing preferences event and snapshot refresh now update editable-card
presentation labels in place. The editor object, body text node, composition,
recovery session and authored section label are retained. No provider, access
policy, storage, Settings write owner or CI change is included. Home/Inputs and
connection-page locale coverage is outside this bounded correction.

Evidence on the final runtime:

- Six complete related unit files:197/197 PASS, zero skipped/cancelled;
  `/tmp/ctx4-locale-final-unit.log`.
- Initial expanded unit run exposed64 fixture failures from missing document
  event support, with52 passing. The three existing DOM stubs were corrected;
  no production fallback was added. Original failure remains at
  `/tmp/ctx4-locale-navigation.log`.
- Existing CTX4-02 complete owning cases, source and isolated release:2/2 PASS,
  zero skipped/cancelled,35.2s total, `/tmp/ctx4-locale-native.log`.
  Actual preference RPC during synthetic IME preserves the exact body node and
  selected Unicode range; no composition text is committed until composition
  ends. Existing edit/delete/undo, failure/recovery, access, protected-owner and
  zero-network assertions remain. This targeted invocation is not the entire
  Context native file or physical-IME evidence.
- Syntax checks and diff whitespace checks pass. Release used a unique temporary
  builder output, preserving builder guards and avoiding shared release caches.

CTX4-04 still denies without a trusted connection verifier; CTX4-05 has no real
processing service; CTX4-06 remains unavailable. Private reference comparisons,
real-client/model effects and complete CTX4-07 acceptance remain open.
