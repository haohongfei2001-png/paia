# Latest seven lanes: remaining engineering inventory

Recorded 2026-10-18 19:22 UTC. This is an execution inventory, not a new product
plan, scope expansion, acceptance certificate or delivery promise.

## Scope and evidence identity

- Current implementation authority is the owner's latest seven coordinated
  lanes. New Sync features remain paused. The historical VS-08–VS-12 mobile,
  MyWrite, voice and typed external-write proposals are outside this round;
  `EXECUTION_PROTOCOL.md`'s controlling restart explicitly prevents using those
  historical instructions to enlarge current authorization.
- Original inspected source: `8275d54b1061922aacf827ea3900fddaacf4a64e`.
- Safely saved P0: `05758297125d0b6e2d80a45d042b5fc2b7350cc1`, independent branch
  `codex/native-maintenance-structured-20261018`. All 22 checkpoint paths were
  read back by Git blob identity; all 4,183 other file entries were preserved.
- P1 existing-Context implementation is still under scoped regression and
  independent review at the time of this inventory. Its final owning receipts
  must identify exact frozen hashes. An earlier test result does not certify a
  later active tree.
- This native workspace is a partial exact materialization, not a complete
  checkout. Git tree comparisons preserve unmaterialized files; absence on disk
  never authorizes deletion.

## A. Confirmed remaining implementation

### 1. Maintenance and existing Context

P1 is implementing independently authorized, bounded existing automatic Item
state, the formal UPDATE / REMOVE_CANDIDATE / NO_CHANGE mappings, shared read
budgets and original Context/Topic final publication fences. Original Source,
Working, human protection, exact revision, lineage, operation receipt and ACK
owners remain authoritative.

The current P1 selector covers old Items whose complete evidence is already in
the selected child scope. It does not yet solve a new independent Input that
repeats or corrects a fact whose old Item has another Input as its source.
Cross-source relevant-state retrieval remains separate implementation: bounded
metadata selection, independently authorized old evidence, exact sent baseline,
and original-owner submission. Whole-profile or whole-Topic body reads are not
an acceptable substitute.

The current original-owner composition also refuses an ungranted new partial
excerpt Entry created by Topic work: the joined Topic transaction rolls back
with zero current-child Topic/Context ACK, rather than claiming the Topic
completed or the Context obligation was explicitly deferred. A newly created
whole-Input mirror from another independently granted child Input is supported.
Preserving legitimate separate facet progress for the partial-excerpt case is
additional finite-matrix work, not established by the whole-Input positive case.

The remaining delta-to-facet matrix must explicitly resolve authored Entry
Topic, Placement Topic, manual Context, and non-rename structural changes.
Each approved outcome needs either a proven original-owner local NO_CHANGE,
bounded semantic implementation, or an honest evidence/authority-limited DEFER.
Blanket ACK, blanket NO_CHANGE and silently dropping obligations are forbidden.

Owners: `core/ai-usage/local-maintenance-session.js`, `maintenance-batch.js`,
`maintenance-payload.js`, formal response adapter and original Topic/Context
owners. Authority: `AI_USAGE_PLAN.md` section 5 and
`AI_USAGE_ARCHITECTURE.md` sections 4–5.

### 2. Topic candidate accumulation and lifecycle

The existing hidden-candidate owner supports lookup, accumulation, expiry and
consume. The production Maintenance session does not yet supply old candidate
identity/revision or bounded old evidence. Cross-window accumulation,
deduplication and reconsideration therefore need real session wiring, with
candidate revision and consume joined to the original Topic publication/ACK.
The original TopicLifecycleService also lacks a production consumer for its
approved bounded lifecycle operations. Versioned parameters and keep/pin/human
history protections must remain effective.

Candidate selection must precede independent processing authorization and
payload/budget freezing. No old body may be fetched after a model decision to
retroactively justify that decision. No new user-visible candidate directory.

### 3. AI Section promotion proposal

Manual Section selection, preview and confirmed promotion already exist.
`SectionPromotionService` is still domain-only; production installs the manual
owner. The approved AI proposal needs bounded Section selection, processing
authority, a formal response contract and the existing human confirmation
bridge. A Maintenance response must never auto-promote a Section. No new inbox
or alternate confirmation/persistence owner is implied.

Authority for 2–3: current `TOPIC_ARCHITECTURE_PLAN.md`, its preserved complete
`TOPIC_ARCHITECTURE_PLAN_PRE_UI_2026-10-13.md`, and `TOPIC_ARCHITECTURE.md`.

### 4. Pro AI Filter opt-in and production binding

The private AI filter owner, bounded scope and processing/epoch checks exist.
The production worker does not supply `aiFilterAuthority`; the existing filter
detail UI only offers light/off. Implement the independently authorized Pro
opt-in and processing lifecycle in that existing detail surface, source-owned
bounded scope selection, and trusted worker binding. A local tier flag, external
Context access switch or ordinary light filter setting is not processing or
paid entitlement authority. Default remains off when unconfigured.

Authority: `AI_USAGE_ARCHITECTURE.md` section 6.

### 5. Assist relevant Context selection

The original Assist action, signed-service transport, recovery and insertion
chain are implemented. Production relevance currently depends on an injected
selector; the local session only accepts manual Items. Implement a source-owned
bounded relevant selector and original-lineage/currentness checks for eligible
automatic Info/Rules/Now. Independently authorize the actual selected fields;
bind cache/lease/final checks to those selections and current reply. No complete
profile scan or substitution of external-read permission for processing consent.

### 6. Context availability and neutral connection owner

Context currently reports automatic capability unavailable and zero connections
statically. Wire truthful configured/authorized/expired/backlog states through
the trusted worker without inferring availability merely from non-null config.
Keep automatic processing status distinct from external connection status.

Local Context CRUD, trusted paginated read domain and local preview exist.
Production still lacks an authenticated external client host, connection
verifier, transport/account binding and pause/revoke/reconnect integration.
Neutral local connection registry, authorization generation and original
connection-page state can be implemented independently. A real transport
adapter still needs the approved client/path selection below; the neutral owner
does not complete CTX4-06.

Authority: current `AI_CONTEXT_CARDS_V2_PLAN.md` and complete
`AI_CONTEXT_CARDS_V2_PLAN_PRE_UI_2026-10-13.md`, CTX4-05/06.

### 7. Production assembly

Four source configuration readers return null; the installed deployment registry
is empty. Existing interfaces are not a configured service. Provider-neutral
source assembly and independent processing/entitlement integration can proceed
without activation. A real model-specific tokenizer/profile implementation and
registered qualified route are not equivalent to inserting a credential.
Concrete identity/provider/region choices, qualification and resource activation
remain separately gated. Preserve conservative default-null behavior meanwhile.

## B. Implemented work requiring later acceptance

- Current R3 floating UI and main-application YEAR-HARMONY surfaces are present.
  Existing UI resources remain byte-identical to the inspected baseline in this
  Maintenance checkpoint. That proves source preservation, not visual fidelity.
- Existing Settings, Archive/Reader, Thought, three-style Organize/cache/
  incremental paths and the signed service/session foundations are not scheduled
  for rewrite merely because integrated live/browser acceptance remains open.
- P0 formal Maintenance response and Section-to-Topic-to-Context paths have
  scoped test and independent static review evidence, not live-model acceptance.
- Changed integrated code still needs applicable real browser Source/release,
  visual/interaction/accessibility/performance, supported-source, real-service
  quality/billing, final-user and exact-integration-version acceptance. Old
  screenshots or lossy R3 navigation thumbnails cannot certify native fidelity.

## C. External decisions and activation prerequisites

- CTX4-06 does not choose a real client, host or local/controlled-bridge/cloud
  transport. Qualify an actual client's identity, callbacks, offline behavior
  and regional suitability, then record that boundary. Existing AI gateway,
  browser Sync and native secure-store authority cannot be repurposed by default.
- AI identity/purchase proof, real signed entitlement/processing principal,
  qualified model/tokenizer/profile, endpoint/region/retention, service resources,
  financial allowance and live quality/billing are independent prerequisites.
  `AI_USAGE_ARCHITECTURE.md` section 8 retains identity/payment selection and
  production activation under B-05; Qwen section 15 is candidate qualification,
  not permission to create resources or spend.
- Credentials, paid calls, deployment and new persistent access have not been
  configured or activated by this development checkpoint.

These items cannot be relabelled as pure acceptance while a client adapter or
concrete production assembly is still missing code.

## Conditional parallel execution sequence

1. Freeze P1 APIs/fences/budgets, run coherent targeted regression and independent
   review, then save an exact independent-branch checkpoint.
2. In parallel: A owns the finite semantic disposition matrix and shared
   Maintenance/Topic integration; B owns Assist selection; C owns Pro Filter
   consent/scope/detail UI. The coordinator owns neutral Context connection/
   status and short, exclusive worker integration windows.
3. Once B's stable Assist slice frees it, B can implement candidate accumulation
   and lifecycle against A's frozen interfaces. Once C's Filter slice frees it,
   C can implement independent AI promotion proposal/confirmation plumbing.
   Shared Topic/Context/session mutations remain one-writer integration work.
4. Provider-neutral production assembly runs behind stable consumer contracts;
   concrete provider/client adapters wait only on their actual necessary choice
   or authorization. Do not pause independent code for those decisions.

Initial owner estimates are engineering ranges, not promises or a division of
total effort by writer count: Assist 2–4 h plus 0.5–1.5 h review; Filter 10–16 h;
semantic matrix 6–12 h; candidate/lifecycle 8–18 h; AI promotion 8–20 h; final
shared integration/review 4–8 h. Candidate and promotion can overlap only after
their precursor writers and stable APIs are available. Cross-source old Context
retrieval and concrete production/client assembly add uncertainty.

The conditional local-code-candidate planning range is approximately 24–48 h
from this inventory, with low confidence and a 48–72 h contingency if additional
persistent-owner contracts or review findings appear. This is not a commitment
that all approved features will have only concentrated acceptance left by that
time: actual client/provider selection and the resulting adapter code are still
unresolved. Re-estimate at each coherent saved checkpoint using remaining code,
not accumulated test counts. Broad acceptance remains postponed; development
compile, privacy, authority and affected safety regression remain mandatory.
