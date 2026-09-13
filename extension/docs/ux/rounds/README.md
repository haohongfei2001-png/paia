# PAIA UX Round Reports

This directory holds execution evidence for UX-R1 through UX-R6. Do not pre-create or pre-mark round reports as complete. The implementation Agent creates `UX_R1_REPORT.md` through `UX_R6_REPORT.md` only when that round is actually executed.

The authoritative report requirement is `PAIA_UX_UI_DEVELOPMENT_SPEC_v1.0.md` §9.4. Each report must contain, at minimum:

- Round ID;
- start commit and end commit;
- the round scope and every applicable DELTA / MIG ID;
- modified paths and the existing domain/services reused;
- user-visible changes;
- compatibility and migration proof;
- every required command that was actually run, with exit code and actual executed / skipped counts;
- real browser journeys and screenshot paths;
- network-call assertions;
- any Design Token adjustment, with the token diff and reason;
- unresolved issues and known limitations;
- G-01 through G-08, each explicitly recorded as `PASS` or `BLOCKED`;
- whether the next round may start, or the exact blocker that prevents it.

## Privacy and evidence rules

Reports must not contain private archive body text, user search queries, API keys / credentials, or raw model responses. Use synthetic or sanitized fixtures and coarse evidence where needed.

`Not run`, missing real Chrome execution, missing migration proof, or an unavailable required environment is not `PASS`. Record it as `BLOCKED`. A visual review does not substitute for domain, trust, browser, or release gates.

## Report template

```md
# UX-RN Report

## Round
- Round ID: UX-RN
- Start commit: <sha>
- End commit: <sha>
- Scope: <UI / DELTA / MIG IDs>

## Changed paths and reused services
- Modified paths:
- Reused domain/services:

## User-visible changes
- ...

## Compatibility / migration evidence
- ...

## Required commands
| Command | Exit code | Executed | Skipped | Evidence / notes |
|---|---:|---:|---:|---|
| `npm run test:unit` | | | | |
| `npm run test:browser` | | | | |
| `node scripts/test.mjs "adapter contract"` | | | | |
| `node scripts/test.mjs "privacy/security"` | | | | |
| `npm run check` | | | | |
| `node scripts/check_development.mjs` | | | | |
| `npm test` | | | | |
| `npm run build:release` | | | | |

## Browser journeys / visual evidence
- Journey results:
- Screenshot paths:
- Viewports / light-dark / keyboard / zoom / IME / reduced-motion evidence as applicable:

## Network assertions
- Provider / extension / external request assertions:

## Design Token changes
- None, or exact token diff + reason + affected screenshots.

## Unresolved issues
- None, or exact issue / limitation.

## Completion gates
| Gate | Result | Evidence |
|---|---|---|
| G-01 Repo baseline | PASS/BLOCKED | |
| G-02 Scope / compatibility | PASS/BLOCKED | |
| G-03 Unit / domain | PASS/BLOCKED | |
| G-04 Real browser | PASS/BLOCKED | |
| G-05 Trust regression | PASS/BLOCKED | |
| G-06 Visual / a11y | PASS/BLOCKED | |
| G-07 Release | PASS/BLOCKED | |
| G-08 Handoff | PASS/BLOCKED | |

## Handoff
- Next round may start: YES/NO
- Blocking reason, if NO:
- Next round starting point:
```

A round becomes `COMPLETE` in `../UX_IMPLEMENTATION_STATUS.md` only after its report demonstrates all required gates have passed.
