# CPR-01 — Trusted Automatic Current-Project Observer and Admission

Execution: `CPR01-20260922-impl01`

Start main: `e9f47e46807f5ea1ff668543895dc393acfbb27d`

Writer branch: `manager/cpr01-trusted-project-observer-20260922`

Status: **COMPLETE / PASS**

## Scope implemented

CPR-01 implements only the CPR-00 frozen provider channel:

`route_plus_matching_project_home_link`

Production behavior now:

- recognizes only canonical current Project routes carrying `g-p-<32 hex>`;
- derives Project display name only from a visible same-Project Project-home link;
- excludes message/editor scopes before reading provider link labels;
- waits when a Project route exists but the strong Project-home name evidence has
  not rendered yet;
- emits a bounded atomic Project observation batch;
- revalidates the current Project identity from trusted `sender.tab.url` in the
  service worker;
- requires internally consistent membership + Project-name evidence before
  trusted admission;
- atomically updates Conversation membership and Project name through the
  existing SourceStructureStore;
- preserves Source/message identity and body truth.

No capture-body logic, frozen ChatGPT capture adapter, manifest permission,
account-wide Project enumeration, sidebar-proximity fallback, CPR-02 Navigator
integration or PRD-03 behavior was added.

## Capability promotion

The production source-structure contract now declares:

- `projectIdentity: verified`;
- `projectName: verified`;
- `membership: verified`.

The following remain unverified and outside CPR-01:

- Project/window order;
- rename/move as independent lifecycle capabilities;
- conversation/project deletion.

## Fail-closed coverage

Tests cover rejection or non-emission for:

- ordinary non-Project conversations;
- custom GPT routes;
- message-body-only Project-looking links;
- conflicting Project names;
- malformed/non-`g-p` Project IDs;
- wrong namespace;
- cross-tab / cross-Project / cross-conversation evidence;
- partial, mixed or internally inconsistent Project batches;
- stale epoch;
- paused or non-consented capture;
- excluded conversations;
- oversized Project names.

Project routes with incomplete strong evidence remain pending instead of being
incorrectly settled as identity-only.

## Certification history

PR: `#46`

Final candidate head:
`9061001200ab36a0b71b03a1d48d5cba7ae3e27a`

Relevant retained history:

- Certification #519 exposed two stale test expectations after the batch protocol
  was hardened; runtime security behavior was not weakened.
- Certification #521 attempt 1 had all CPR-01/current gates green except Full
  Suite, where an unrelated existing UX-R2 Playwright click detached during a
  re-render.
- The failed Full Suite job was rerun without code changes.
- Certification #521 / run `35726508816` / attempt 2: **SUCCESS**.

Merged main:
`c7b51f85512658a8e127d45a9389b62c38e3218a`

Exact-main Certification:
`PAIA Certification #522 / run 35738998605 / attempt 1 / SUCCESS`

Every required current job passed:

- Current Browser Certification;
- Full Suite Certification;
- Unit 1/4 through 4/4;
- Adapter and privacy contracts;
- Current release build and guards;
- macOS Secure Store Certification;
- final Certification gate.

Historical Browser Audit remained skipped by design.

## Closure

CPR-01 is COMPLETE / PASS.

CPR-02 is READY but NOT_STARTED.

PRD-03 remains BLOCKED until the entire
`PAIA-CHATGPT-PROJECT-RECOGNITION-v1` package is COMPLETE.

No CPR-02 implementation or PRD-03 work is authorized by this closure.
