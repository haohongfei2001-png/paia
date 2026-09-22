# CPR-00 — Live ChatGPT Project Capability Discovery

Execution: `CPR00-20260922-live01`

Start main: `20708e87df9d0036990aeda8eb80807fb70fc5dd`

Writer: `manager/cpr00-live-discovery-20260922`

Status: **IN_PROGRESS — ENGINEERING PUBLISHED; LIVE EVIDENCE PENDING**

## Purpose

Determine whether current ChatGPT exposes a privacy-safe, sufficiently stable
current-conversation evidence chain for:

- Project identity;
- Project display name;
- Conversation → Project membership.

CPR-00 does not promote production capability flags. The current
`source-structure-contract.js` remains unchanged with all three capabilities
`unverified`.

## Candidate evidence hypothesis

Publicly observable ChatGPT Project links have used routes shaped like:

- Project conversation: `/g/g-p-<opaque-id>-<slug>/c/<conversation-id>`;
- Project home: `/g/g-p-<opaque-id>-<slug>/project`.

Custom GPT conversations also use `/g/.../c/...`, so a generic `/g/` prefix
is explicitly insufficient.

The probe therefore treats only a canonical `g-p-` opaque identifier candidate
as Project identity evidence and never derives Project name from the slug.

## Discovery probe

The CPR-00 probe is explicit, read-only and sanitized.

It may inspect:

- current route shape;
- same-origin Project-home/chat anchor structure outside message/editor scopes;
- bounded Project-specific data attributes outside message/editor scopes;
- structural relation of the current conversation link for diagnosis.

It never emits raw Project IDs, Project names, conversation IDs or URLs.
Project IDs and names are hashed with a random per-run salt that is never emitted.

It does not read:

- user message bodies;
- assistant bodies;
- drafts/editor text;
- cookies;
- credentials;
- unrelated pages.

## Strong evidence rule

A CPR-00 candidate contract may be considered ready only when the current
conversation has a route-bound Project ID and the same Project ID binds to a
visible provider Project-name source, currently one of:

1. a matching Project-home link; or
2. a matching visible header Project attribute.

Sidebar proximity alone is diagnostic only and cannot establish membership.

A current-conversation link label is a conversation title, not Project name, and
cannot satisfy the name requirement.

## Required live sequence

One normal owner-authorized run captures, with one per-run salt:

1. a known Project conversation;
2. the same Project conversation after page reload;
3. a known ordinary non-Project conversation;
4. return to the original Project conversation after navigating away.

The result must preserve the same Project/name digests across reload and
away/back while the ordinary conversation produces no membership signal.

## Negative coverage

Synthetic/browser tests cover:

- ordinary `/c/` chat;
- custom GPT `/g/g-.../c/...`;
- a Project-looking link inside user message body;
- a current conversation title that must not become Project name;
- sidebar-proximity-only membership;
- run-local digest stability and cross-run unlinkability;
- stale runtime parity fail-closed.

Synthetic evidence validates the parser/sanitizer only; it cannot certify the
live provider capability.

## Engineering publication

PR #44 published the CPR-00 discovery probe.

Candidate head:
`eda0857d454c7f18fb129be839f483e2742ba09b`

Candidate Certification:
`PAIA Certification #493 / run 35701966427 / attempt 1 / SUCCESS`

Merged runtime main:
`8f72cc87c66ed382e6ab131834e1f2a152270672`

Exact-main Certification:
`PAIA Certification #494 / run 35706677451 / attempt 1 / SUCCESS`

Every required current job passed:

- Current Browser Certification;
- Full Suite Certification;
- Unit 1/4 through 4/4;
- Adapter and privacy contracts;
- Current release build and guards;
- macOS Secure Store Certification;
- final Certification gate.

During candidate hardening, an attempted probe insertion into the frozen
ChatGPT capture adapter was rejected by the existing frozen-capture guard. The
implementation was corrected rather than weakening the freeze: the adapter was
restored byte-for-byte and the discovery probe moved into the
source-structure bridge. The frozen-capture test then passed.

The current production capability declarations remain unchanged:

- `projectIdentity: unverified`;
- `projectName: unverified`;
- `membership: unverified`.

CI validates the probe/parser/privacy boundaries only. It does not substitute
for the required real ChatGPT evidence.

## First live discovery result — strong candidate, reload proof missing

The first real normal-use Project discovery result was complete but returned
`contractCandidateReady=false` for exactly one reason:
`reloadNewDocument`.

All substantive Project evidence checks passed:

- current Project identity candidate: PASS;
- Project display-name candidate: PASS;
- current Conversation→Project membership candidate: PASS;
- same strong evidence across the submitted second observation: PASS;
- ordinary non-Project conversation negative: PASS;
- same strong evidence after navigating away/back: PASS;
- privacy boundary: PASS;
- runtime parity: PASS.

The observed strong channel was:

`route_plus_matching_project_home_link`

Within the run, the route-bound Project digest matched a visible Project-home
link, and that same link supplied one stable Project-name digest. The ordinary
chat emitted no Project channel.

The result cannot yet certify reload stability because the Project, claimed
reload, and return snapshots all reported the same run-local
`pageInstanceDigest`. A true document reload must create a new content-script
instance and therefore a new page-instance digest.

This is retained as real live evidence, not relabeled PASS.

No code or contract change is required from this result. The next bounded action
is to keep the same helper run alive, perform an unmistakable browser reload on
the Project conversation tab itself, and recapture only the "刷新后" observation.
If that helper run is no longer open, redo the four-step sequence once.

## Second live discovery result — fresh-document mechanism proven, reload tab selection still ambiguous

A second complete live run reproduced the same strong Project evidence:

- Project identity candidate: PASS;
- Project name candidate: PASS;
- membership candidate: PASS;
- ordinary chat negative: PASS;
- away/back stability: PASS;
- privacy and runtime parity: PASS.

The claimed reload observation still had the same page-instance digest as the
first Project observation. However, the later Project-return observation had a
different page-instance digest while preserving the same conversation, Project
and Project-name digests.

Therefore the page-instance nonce is functioning. The remaining ambiguity is the
helper's tab selection: it re-enumerated all responsive ChatGPT tabs and chose by
recent access on every step, so duplicate/same-conversation tabs could satisfy
the reload lookup.

The correction is development-only: the first Project observation now locks one
Chrome tab ID in helper memory. Reload, ordinary-chat and return observations
must all come from that exact tab. The tab ID is never emitted in the sanitized
result and is not persisted.

## Same-tab helper correction certification

PR #45 made the live helper deterministic by locking all four observations to
the exact first Project tab.

Candidate head:
`4237ae62ce43d7885f98dcf4d2fab162333086c6`

Candidate Certification:
`PAIA Certification #499 / run 35712059351 / attempt 1 / SUCCESS`

Merged main:
`ea752ea9e8ddfc76e820d66c9fe69a47ade007b9`

Exact-main Certification:
`PAIA Certification #500 / run 35714708162 / attempt 1 / SUCCESS`

Every required current job passed. No production runtime Project contract,
capture adapter, manifest permission or capability flag changed.

The remaining live step is one fresh helper run from the latest repository. The
existing loaded PAIA runtime may be reused because the correction is confined to
the development helper copied by `CPR-00 Project Discovery.command`.

## Pending closure

CPR-00 still requires:

1. pull the latest repository helper files;
2. run `CPR-00 Project Discovery.command` without another production Update/Reload;
3. complete the four observations in the single locked ChatGPT tab;
4. preserve one result with `reloadNewDocument=true`;
5. freeze the provider contract if all checks pass;
6. publish final receipt/status and stop.

No CPR-01 implementation is authorized in this execution.
