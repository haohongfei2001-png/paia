# Original extension-page editor freeze issuer and client

Base: safety closure `2fdf346890b11894d69d763b8d92564545f3d286`. This package adds only two guard modules and their synthetic owning tests. It does not connect pages/worker or re-enable selection, and does not claim content-script/background writer quiescence.

## Fixed protocol

The single worker issuer accepts only original extension identity, known Archive/Popup/Prompt URLs, exact documentId/frame, non-incognito and active sender. Runtime getContexts must exist. Its complete extension-document set must match all live READY ports one-for-one; unknown, duplicate, missing or unregistered documents refuse. No fallback equates missing inventory with no editors. Limit is 64 documents; the 30-second wait can only reject, never authorize.

Page registration blocks new input until REGISTERED. PREPARE synchronously blocks editing interactions, then invokes its original owner prepare/flush and synchronous current check. Refusal preserves the page; body-free FROZEN carries only nonce. A fresh CHECK challenge asks every owner to recheck current state before each completed fence. New port, disconnect, invalid/replayed message, input invalidation, owner change or inventory change revokes the private token. A repeated fence in progress is not a usable completed proof. Tokens are private WeakMap identities bound to the single issuer and cannot be synthesized or moved to another issuer.

During PREPARE, the worker API allows the unacknowledged document's original flush RPCs, blocks acknowledged documents, and blocks unknown senders. After all FROZEN replies it blocks globally while checking and holding the cut. The worker integrator must actually apply this gate, preserve its own in-flight accounting, and qualify non-RPC writers separately. Fixed Settings status/cancel/restart controls may remain interactive while the rest of the page is frozen; this does not authorize the command itself. Existing command activation/continue/restart refusal remains in place.

The issuer intentionally exposes only extension-page freeze capabilities. It cannot authorize backend activation: host content insertion/capture and timers/storage/background writes require independent original-owner settlement/fences. No generic caller callback, boolean or DTO supplies that missing proof. No backend, lifecycle, manifest or production configuration changed.

## API for root-owned integration

- Worker: createApplicationEditorGuard(api); connect(port); freezeExtensionPages(sender.documentId); fenceExtensionPages(token); assertFrozenExtensionPages(token); blocksMutation(sender); release(token); close().
- Page: installApplicationEditorGuard({prepare,current,release},{api,document,target}); returned invalidate(), isFrozen(), dispose().
- Port name: paia-application-editor-guard:v1. Page HELLO is fixed READY/version1. Other messages are REGISTERED, PREPARE/FROZEN/DENIED/INVALIDATED/RELEASE nonce, and CHECK/CHECKED nonce+challenge. No text, entity list or permissions in messages.
- Page owner must use genuine dirty/IME/result-unknown handling. Release must restore its original UI without discarding drafts; disconnected page stays blocked. Registration must precede writable interaction. Root owns actual Archive/Popup/Prompt/Next hookup and worker admission.

## Validation

Absolute isolated official Node22.23.3, synthetic EventTargets and paired ports only; no browser/build/cloud/real data.

- first.log: initial 11/11 owning cases.
- final.log: after making a failed inventory fence revoke its token, four complete files 34/34, exit0, no fail/cancel/skip/todo, TAP4070.668ms. Files: application-editor-guard, application-selection-editor-safety, application-selection-consumer, settings-sync.
- fence-final.log: subsequent explicit in-flight-fence invalidity rule and its new regression, full guard file12/12, exit0, no fail/cancel/skip/todo, TAP44.353458ms. This is separate from the preceding34 run.

Cases cover all-page success, pre-ACK flush allowance, dirty/IME/unknown/save-failure denials, missing/unknown/duplicate inventory, absent API, disconnect during flush, new document, stale owner recheck, input invalidation, blocked interaction, cross-issuer/forged token and unfinished repeated fence. No successful product activation, cross-content proof or native qualification is claimed.
