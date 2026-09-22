# CPR-00 — Live ChatGPT Project Capability Discovery

Execution: `CPR00-20260922-live01`

Start main: `20708e87df9d0036990aeda8eb80807fb70fc5dd`

Writer: `manager/cpr00-live-discovery-20260922`

Status: **IN_PROGRESS — PROBE ENGINEERING PENDING CERTIFICATION; LIVE EVIDENCE NOT YET COLLECTED**

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

## Pending closure

CPR-00 still requires:

1. targeted + required candidate CI;
2. merge and exact-main CI;
3. update/reload the existing daily PAIA runtime to that certified main;
4. one sanitized real-site discovery run;
5. classify the observed evidence;
6. freeze an exact provider contract if and only if all three required
   capabilities are supported;
7. publish final receipt/status and stop.

No CPR-01 implementation is authorized in this execution.
