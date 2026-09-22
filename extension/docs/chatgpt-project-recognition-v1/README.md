# PAIA ChatGPT Project Recognition v1

Package ID: `PAIA-CHATGPT-PROJECT-RECOGNITION-v1`

## Purpose

Close the product gap left intentionally unresolved by Archive Navigation &
Source Structure v1: PAIA must automatically recognize the current ChatGPT
Project when the user normally opens or navigates a ChatGPT conversation.

The minimum product outcome is not a generic fallback pipeline. It is real,
privacy-safe current-site verification of:

- `projectIdentity`;
- `projectName`;
- Conversation → Project `membership`.

Those three capabilities must become genuinely `verified` for the supported
current ChatGPT surface before this package may be COMPLETE.

## Why this package exists

ANS-01..09 correctly implemented durable relationship models, admission,
Navigator projections and fallback behavior, but its frozen contract allowed
ChatGPT Project capabilities to remain `unverified/unavailable` when no safe
live contract had been proven.

That historical package remains COMPLETE under its original contract.

The product owner has now tightened the acceptance standard: a daily PAIA
installation must not leave ordinary ChatGPT Project conversations permanently in
"项目未知/归属未知" merely because the generic infrastructure can represent
unknown state.

## Product behavior

Normal behavior must be passive:

1. user opens or navigates ChatGPT normally;
2. PAIA recognizes the current conversation;
3. PAIA obtains trustworthy Project identity/name/membership evidence without
   requiring manual classification;
4. PAIA reconciles the existing source-structure store;
5. Archive Navigator updates automatically.

No manual Project assignment is introduced as a substitute for provider truth.

## Hard boundaries

This package does not authorize:

- account-wide crawling;
- reading assistant responses, drafts, keystrokes, cookies or credentials;
- new host permissions merely for convenience;
- Project inference from conversation title/body text;
- fabricated membership from sidebar visual proximity alone;
- changing Source/message identity;
- cloud sync;
- semantic/vector work;
- PRD-03 execution.

If current ChatGPT provides no privacy-safe, sufficiently stable evidence channel,
the package must report BLOCKED/FAIL. It may not complete by silently returning
`unknown/unavailable` for the three required capabilities.

## Relationship to Production Readiness

This package is blocked until PRD-02 is COMPLETE.

After this package is COMPLETE, PRD-03 may become READY. Until then PRD-03 is
blocked.
