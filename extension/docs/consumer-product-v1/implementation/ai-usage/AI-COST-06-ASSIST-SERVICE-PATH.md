# AI-COST-06 explicit current-reply service path

## Independent boundary-review repair, 2026-10-18

Independent review of frozen 178831ef reproduced three additional failures,
despite the preceding 46 scoped passes. The two exact boundary probes and the
actual-content ACK probe were first run unchanged against that frozen source:
2/2 and 1/1 failed. These failures remain separate evidence; the earlier passes
did not establish the missing boundaries.

The original surface qualification now accompanies the private session and is
rechecked through its original currentness path, including the final physical
send's repository write fence. Closing the authenticated surface during proof
acquisition produces zero remote calls. Closing it after the original dispatch
record commits produces zero physical provider calls while retaining the
original possibly-started attempt. No content or financial fence was removed.

Explicit cancellation before original financial registration aborts the live
operation without prematurely writing an irreversible CANCELLED receipt.
Original prepare remains responsible for any registration that crosses that
edge. Its existing precise never-published marker rollback lets a new explicit
action reuse the same reply and original PLANNED job (one job, cancelEpoch zero).
Published/unknown operations retain their original metadata/recovery behavior;
no terminal job or paid attempt is reset, replaced or given a new identity.
Foundation was not modified by this repair.

The original content bridge now advances an invalidation-only Context epoch
when it handles the trusted worker notification. It captures that epoch before
QUALIFY and checks it in the final synchronous composer guard. A successful
worker Context change notifies only registered original top-document identities
before its mutation response, then sends the existing Assist CHANGED signal to
the unchanged UI. The notification never grants authority; a later explicit
action still needs the original worker's fresh Context qualification. An
unrelated cached result remains reusable without another provider call.

The linearization boundary is receipt/handling of the revocation notification:
a previously issued QUALIFY ACK cannot insert after that local event. This does
not claim instantaneous remote revocation while a notification remains in
transit. The current worker qualification remains the sole Context authority.

Changed-boundary verification passed 54/54 with zero failures/skips:

```
node --test --test-reporter=tap \
  services/ai-gateway/tests/assist-client-boundaries.test.mjs \
  services/ai-gateway/tests/assist-client-content-ack.test.mjs \
  services/ai-gateway/tests/assist-client-path.test.mjs \
  services/ai-gateway/tests/assist-client-recovery.test.mjs \
  extension/tests/assist-consent.test.mjs \
  extension/tests/assist-content-bridge.test.mjs \
  extension/tests/feature-retirement-worker.test.mjs
```

The original private local-session owner separately passed 49/49:
`node --test --test-reporter=tap extension/tests/ai-assist-private-session.test.mjs`.
New owning files are `assist-client-boundaries.test.mjs` (three cases) and
`assist-client-content-ack.test.mjs` (two cases). The initial probe identities
are preserved in the local evidence directory; permanent tests omit diagnostic
result bodies. No UI files, Maintenance owners, shared Foundation, global
documents or workflows changed. This remains synthetic signed-handler/content
verification, not native, PostgreSQL, live-provider or broad acceptance.

## Connected-source checkpoint, 2026-10-18

The actual original Prompt more-menu and distinct Settings controls are now
connected through authenticated surface RPC, the prospective current-reply
reader/lease, original LocalAssistSession, Qwen declaration/reservation/status/
provider transports, original Foundation result CAS and result-report owner.
The public view explicitly projects the narrow SUGGESTION/DEFER DTO; the
internal bounded response keeps its original version. Condition presentation,
fresh result/dependency qualification and original composer insertion are all
required. Insertion never sends a message.

This local checkpoint includes reviewed Organize/Context b17a293a, Maintenance
2df23843 (including bounded Assist execution), and independently reviewed UI
beb87a71. The separate Assist-only cold recovery was added to original
Foundation after the Maintenance author explicitly handed back that file. No
Maintenance, Organize or Historical financial semantics were changed.

Recovery accepts private original-operation handles and actual original
transport observations, rechecks all saved rows/fences and current financial
identity in the final transaction, and publishes only body-free FAILED metadata.
Known settlement remains spent; UNKNOWN retains its original hold. A cold
reader session cannot rebill an old reply. Relevant Context edits in the same
valid live reply session can qualify a new explicit evaluation; unrelated edits
reuse the original cache. A pre-publication local denial does not consume the
reply. Only a proven never-started publication can restore its own preflight;
once publication has been attempted, unknown remote state is never cleared.

Settings uses two independent default-off session-only permissions and required
generation CAS. Real storage change events invalidate old leases immediately
without stranding the acknowledged configure operation. The actual configured
route refuses either missing permission before creating a job or remote request.
The source-owned configuration remains null: local consent does not configure
or activate any service. Any later real configuration still needs appropriate
recipient/region disclosures and resource qualification; no configuration UI,
credentials, permissions, paid resources or remote activation were added.

### Scoped evidence

- First missing-path RED remains recorded below: absent configured composition,
  followed by absent original Foundation recovery. Both source paths now exist.
- Original local Assist, content bridge, separate consent, configuration/wire,
  original Qwen financial/result and UI owners: 119/119 scoped tests passed.
  This was before the final storage-event/navigation regressions.
- Final changed-boundary run: 46/46 passed, zero failures/skips: 18 actual signed
  Assist path cases, 13 Assist recovery cases, 11 consent cases and four actual
  worker/retirement cases. This is overlapping evidence, not 165 unique cases.
- Signed vertical covers ten concurrent same-key actions/one physical request,
  actual PromptAssistState and SettingsAssistState through original commands,
  partial local/remote ACK, distinct missing consents, revocation/new reply,
  relevant/unrelated Context, final insertion revocation, DEFER, cancellation
  before/after send, no-send and same-document navigation.
- Recovery covers cold no-rebill/no-body, unknown hold retention, exact original
  unsent cancellation, cloned/foreign proof rejection, competing/replayed handles,
  final marker/job/attempt/reply-fence/flight/dispatch/authority rollback and
  identical FAILED metadata retry after lost result ACK.
- The service fixture uses actual signed issuers and HTTP handlers with original
  local result/financial owners. External HTTPS completion and SQL transport are
  synthetic. Content bridge tests use the original reader and result controller
  with synthetic DOM/composer/worker transports. These are not native browser,
  PostgreSQL, installed extension or live provider acceptance.

Independent Assist code review, real browser/release and broader acceptance
remain separate. No Full, build, old PostgreSQL matrix, remote write, deployment
or paid call was run. The original lease's supported canonical `/c/` URLs remain
conservative; this receipt does not claim broader ChatGPT route support.

## Preserved initial development checkpoint

This slice continues the approved original Prompt/AI Usage programme on local
`codex/assist-service-path-20261018`, after merging reviewed Organize/Context
`b17a293ac360d3ff6c6952e7206224acbfc4bb14`. It is not deployed, installed, remotely
activated, independently reviewed, or accepted as a complete product.

The first missing-path RED is the new actual composition test failing with
`ERR_MODULE_NOT_FOUND` for `configured-assist-session.js`. The intermediate
signed-handler vertical reaches the missing original Foundation
`assistRecovery` method; that is still RED at this checkpoint, rather than a
constructor-only success. Shared Foundation integration is serialized behind
the Maintenance owner.

The slice adds source-owned default-null Assist configuration and composition,
connects the original LocalAssistSession to the original Qwen declaration,
reservation, status, provider and result transports, and uses its original
private output validation and local result CAS. No provider/identity/tokenizer,
paid resource, endpoint permission, entitlement or allowance is configured.

The original Prompt surface has a narrow authenticated Assist command route.
Two independent session-only default-off permissions have a separate Settings
owner; neither is the Stage 3A authorization whose disclosure promises no
upload. The original prospective reader is armed only after both permissions.
Only an explicit surface activation may ask for the bounded current reply.
Completion, readiness, card opening and hover do not create an AI job or paid
request. Current reply/result bytes remain private transient memory; no bodies
are added to Archive, backup, job, receipt or diagnostics.

The content bridge uses the original AssistResultController and native composer
interface. Insertion must explicitly acknowledge a displayed condition, qualify
the exact current result/dependencies again and pass the synchronous current
reply guard. It fills the composer only. Pending activation cancellation is
bound to the original surface nonce/identity, uses original cancellation/UNKNOWN
semantics, and does not claim that an uncertain service hold was released.

A body-free hashed reply reader-session fence rejects a cold session's old
reply; it is not a consumption/spend record. Within the same genuine live
reader session, a relevant Context change may qualify a different evaluation.
Original service and attempt owners alone enforce financial admission.

## Scoped evidence at this checkpoint

- Original local Assist, separate consent, source-owned unconfigured commands,
  and actual content-bridge tests: 62/62, zero failures/skips.
- The content bridge cases use the actual prospective reader and original
  result controller with synthetic DOM/composer/worker transports. They prove
  no historical snapshot, no automatic paid path, condition qualification and
  no send. They are not native browser/device evidence.
- The new signed-handler service vertical is written but currently RED for the
  specifically missing Foundation recovery integration. Its external provider
  and SQL transport are synthetic, not PostgreSQL/live provider evidence.

UI integration, final scoped positive/negative signed-handler checks,
independent review, actual browser/release and broad acceptance remain pending.
No Full run, old PostgreSQL matrix, build matrix or remote write was requested.
