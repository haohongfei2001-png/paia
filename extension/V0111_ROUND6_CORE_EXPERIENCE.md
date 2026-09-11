# v0.11.1 Round 6 — Core Experience Closure

Status: **in development on a stacked review branch; not merged to `main` and not deployed to the daily Chrome profile**.

Base branch: `round5/topic-quality-stability`.
Base SHA: `10abdf99ef73bb50a5da345a6eea5bd0ff316434`.
Branch: `round6/core-experience-closure`.

## Goal

Round 6 closes the primary product path:

`Input Archive → Thought Library → AI Context`

It is intentionally a product-closure round rather than a new-capability round. The underlying data architecture, Organizer safety model and AI Context authorization model are not being redesigned.

The intended first-value experience is:

1. Input Archive makes it clear that the user's own AI inputs have been retained and remain readable/editable.
2. Thought Library makes it clear what it is for and, when empty, where the user deliberately starts organization without placing Organizer controls back on the reading surface.
3. AI Context makes the authorization boundary legible: allowed content is only eligible for local context construction; authorization itself is not transmission; sharing happens only after explicit Preview and Copy/Export.

## Product changes

### Thought Library empty state

The empty state now explains that Thought Library turns durable Input Archive material into long-lived Topics while preserving the user's wording by default.

It explicitly states that opening Thought Library does not start organization or call AI. A single low-emphasis route sends the user to Settings to organize new content.

This preserves the existing design rule that Thought Library is a reading surface. No Organizer controls, API keys, job controls or cost diagnostics are added to the Thought Library home or Topic reading page.

### AI Context home

The AI Context home is reframed around the actual trust boundary rather than permission mechanics alone.

It now states:

- how many Topics are currently eligible to enter AI Context;
- how many remain unauthorized;
- authorization is not sharing;
- PAIA does not automatically send AI Context to an external AI;
- local context preparation does not call an external AI;
- content leaves PAIA only after the user explicitly copies or exports a Preview.

The underlying authorization, Profile, exclusion, retrieval, budget and Preview mechanisms are unchanged.

### Organizer control hierarchy

Settings keeps the existing normal one-request Organizer path as the primary control.

The two bounded multi-request actions are demoted into a collapsed `批量整理` disclosure. Their request/content caps and explicit-action semantics remain unchanged. The duplicate legacy single-update button remains only as a hidden compatibility node because the current controller still binds it; it is no longer another visible action.

The active bounded-operation status and Stop control remain outside the disclosure so an in-progress action cannot become visually hidden merely because the disclosure is closed.

## Safety boundaries

Round 6 does **not**:

- add a new first-level navigation item;
- put Organizer controls back onto Thought Library reading surfaces;
- change Source Record, Input Archive, Topic, Section, Entry or provenance semantics;
- change IndexedDB schema or migration behavior;
- change Organizer batching, daily limits, single-flight behavior, retry behavior or provider dispatch rules;
- add a provider request;
- change the DeepSeek model or request contract;
- change AI Context authorization, exclusion, Profile, retrieval, budget or external-access enforcement;
- claim that prior exported/copied data can be revoked;
- auto-share anything with an AI;
- deploy to the user's daily Chrome profile.

The existing Round 2–4 long-lived real-data structural gate remains required before this stacked line can reach the daily extension.

## Implementation shape

The product copy/layout closure is implemented in `ui/archive.html` and deliberately reuses existing controls and event wiring:

- the Thought Library empty-state route uses the existing `data-view="settings"` navigation handler;
- AI Context keeps the existing `memory-allowed` and `memory-denied` dynamic values supplied by `MemoryPanel`;
- the normal Organizer action remains `original-library-menu`;
- bounded Organizer actions retain their existing IDs and controller behavior;
- `start-thought-library` remains in the DOM as hidden compatibility markup until its existing controller binding is separately retired.

No second runtime entry script is introduced.

## Verification plan

Before Round 6 is development-closed, the branch must pass:

- focused Round 6 UI-contract regressions;
- the portable unit suite, excluding only the same three already-documented non-portable migrated-history/hosted-runner fixtures from Round 5;
- package audit;
- release build and emitted-product guard.

The temporary branch-only CI workflow is development scaffolding and will be removed after a final green run. Automated tests do not replace the real long-lived IndexedDB deployment gate.
