# Bounded capture recovery repair — 2026-09-30

Scope: repair existing ChatGPT capture lifecycle. This does not resume the paused Consumer Product roadmap, activate Draft #99, deploy to a daily profile, or claim current-live provider certification.

## Reviewed permission change

The owner approved adding `scripting` and only `https://chatgpt.com/*` host access for automatic reconnection of already-open ChatGPT pages. No `tabs`, broad host, credentials, history, new provider, telemetry, or external request permission is added. Chrome may request acceptance when this permission change is installed. The existing capture consent and pause settings remain authoritative.

Chrome supports programmatic injection through [chrome.scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting). The [runtime lifecycle](https://developer.chrome.com/docs/extensions/reference/api/runtime) treats unpacked extension reload as an update. Worker suspension alone is normal and is recovered through fresh runtime messages, without an extension or page reload.

## Runtime behavior

- A trusted, event-driven coordinator probes only top-level, non-incognito, nondiscarded, nonfrozen ChatGPT tabs after install/update, profile startup, tab activation/completion/resume or relevant permission grant
- The coordinator waits for trusted storage isolation and pins all bundled file injections to the Chrome document ID observed by its exact-origin probe
- A same-version extension reload replaces the pipeline generation; normal activation leaves a verified live instance in place
- Every new instance rechecks consent, enabled state, runtime version and epoch before collection; the trusted writer retains identity, tombstone, dedupe, provenance and exclusion enforcement
- Existing content scripts have deterministic retirement, stale-await fences and bounded request timeouts. The MAIN fetch dispatcher remains single across repeated replacement and never replays a page request
- Migration from old main retires the old response-control channel. New metadata/control uses v2; a stop-only compatibility fence blocks delayed legacy activation. The old fetch wrapper can remain an inert passthrough, not an active second observer
- Transient status failure retries after a bounded timeout, with no source scan and no false page-refresh warning. A truly disconnected document gets a small delayed status only if replacement never arrives; refreshing is always an explicit user action
- No input field, unsent draft, assistant message or new source category is admitted; no automatic page reload, durable content schema change or body cache is introduced

## Verification boundaries

Owning Node tests cover dispatch scope, document pinning, failed isolation, permission failure/retry, concurrency, retirement, transport timeout, late replies, consent/pause and trusted write version enforcement. Existing privacy/package/release guards retain exact reviewed permission allowlists and restrict scripting to the recovery coordinator.

Hosted synthetic Chrome tests must establish actual old-main upgrade, same-version reload, new-tab/discard/restart behavior, pending status, repeated reconnect, unsent input preservation, paused/unconsented refusal and actual post-recovery source persistence. Evidence is tied to the tested commit, with synthetic screenshots and logs. Green mocks or successful script injection alone are not capture-success evidence. Signed update distribution and real authenticated ChatGPT validation remain separate, unclaimed gates.
