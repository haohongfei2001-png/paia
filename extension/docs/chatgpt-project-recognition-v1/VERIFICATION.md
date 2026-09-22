# Verification — PAIA ChatGPT Project Recognition v1

## Mandatory invariants

C01 — Project identity comes from an explicitly audited body-free live contract.

C02 — Project name is provider evidence, never inferred from message body,
conversation title or user-authored PAIA text.

C03 — Conversation membership is current relationship evidence and does not alter
Source/message identity.

C04 — Ordinary non-Project conversations are not mislabeled as Project members.

C05 — `/g/` custom-GPT routing is not itself Project evidence.

C06 — stale SPA DOM, partial sidebar rendering and navigation races fail closed.

C07 — pause/consent/exclusion boundaries remain authoritative.

C08 — no assistant body, draft, editor text, cookie, credential or unrelated page
data enters the Project observation path.

C09 — relationship updates preserve last-known/history semantics from ANS.

C10 — recognized Project conversations automatically update Navigator without
manual classification.

C11 — reload/remount/navigation does not duplicate Source or Project relationship
events.

C12 — private live evidence stays local; Git receives only counts, fixed states,
versions and non-reversible digests where necessary.

## Required capability verdict

The package cannot be marked COMPLETE unless all are `verified`:

- projectIdentity;
- projectName;
- membership.

Synthetic fixtures can prove parser/reducer behavior but cannot establish these
three live-provider verdicts.

## CI

Every code-bearing round requires:

- targeted provider/admission/privacy tests;
- current release guards;
- Adapter & privacy contracts;
- Current Browser Certification;
- Full Suite Certification;
- exact-main certification after merge.

A real-site canary is additional evidence and cannot be replaced by CI.
