# Development Plan — PAIA ChatGPT Project Recognition v1

## CPR-00 — Live capability discovery and contract freeze

Purpose: determine exactly what current ChatGPT exposes for current-conversation
Project identity/name/membership, using normal owner-authorized activity.

Work:

- inspect only the currently opened ChatGPT page/session through existing allowed
  extension surfaces;
- enumerate candidate evidence channels (canonical route state, stable DOM
  attributes, already-observed response metadata, other body-free first-party
  state);
- prove each candidate cannot be confused by ordinary non-Project chats,
  custom-GPT `/g/` routes, message body text containing Project names, partial
  sidebar rendering or stale SPA DOM;
- document stability across navigation away/back and fresh reload;
- freeze an exact provider contract and sanitizer.

Exit:

- PASS only if at least one privacy-safe evidence path can establish all three
  required capabilities with explicit negative cases;
- otherwise BLOCKED/FAIL with the limitation preserved.

No production capability flag changes in CPR-00.

## CPR-01 — Trusted automatic current-Project observer

Purpose: implement the frozen live contract.

Work:

- extend the ChatGPT source-structure provider, not generic capture body logic;
- emit body-free DTOs for project identity/name/current membership;
- retain consent/epoch/current-route/session/exclusion gates;
- validate DTOs through the existing source-structure admission/store;
- update capability flags to `verified` only for fields proven by CPR-00;
- no manual classification and no account-wide enumeration.

Required negatives:

- ordinary non-Project chat;
- custom GPT route that is not Project membership;
- Project name text appearing in a message;
- stale route/SPA node;
- malformed/truncated evidence;
- paused/consent-disabled capture;
- cross-tab/cross-conversation evidence.

## CPR-02 — Lifecycle and Navigator integration

Purpose: ensure automatic recognition produces correct product behavior.

Required journeys:

- open a Project conversation directly;
- SPA navigation between two Project conversations;
- Project conversation → ordinary conversation;
- ordinary conversation → Project conversation;
- Project A → Project B current membership change when reliable evidence exists;
- Project rename when reliable current-name evidence exists;
- temporary inability to observe evidence must preserve last-known/unknown rules
  rather than invent membership.

Navigator requirements:

- recognized Project conversations leave "项目未知";
- unassigned and unknown remain distinct;
- selected conversation identity does not change when membership changes;
- no Source/body rewrite;
- no duplicate conversation after navigation/reload.

## CPR-03 — Real normal-use certification

Purpose: prove the feature works without a scripted user ritual.

Evidence:

- current logged-in ChatGPT normal use;
- at least one recognized Project conversation;
- at least one ordinary non-Project conversation;
- navigation/reload reconciliation;
- zero fabricated Project membership in declared observation window;
- sanitized output only;
- candidate CI + exact-main CI.

Exit:

- `projectIdentity/projectName/membership = verified`;
- real normal-use canary PASS;
- package STATUS = COMPLETE;
- PRD-03 may become READY, but is not started in the same execution.
