# PAIA v0.11.1 — real-data read-only gate

Status: **required before merging the current P0 repair to `main` or deploying it to the daily Chrome profile**.

This gate exists because synthetic fixtures proved the failure classes and repair behavior, but they do not prove the exact shape of the user's long-lived IndexedDB. The repair branch must not be installed merely to inspect that database.

## What to run

Use the existing daily PAIA extension page and execute the exact contents of:

`development/inspect-library-readonly.js`

in that page's DevTools Console.

Expected SHA-256 of the diagnostic source:

`6777b40e3f6e99e8950dad4ce82fc2b3b5db83c323edc559eb23dc5f2e635588`

The script must be run from the **existing extension context** before the P0 repair branch is installed.

## What it does

The diagnostic:

- enumerates the already existing `paia-archive` database;
- opens the exact already-observed database version;
- aborts every attempted IndexedDB upgrade;
- creates one native `readonly` transaction;
- reads only structural Topic/Section/placement/index and two migration-marker states;
- does not initialize PAIA Store/Repository classes;
- does not run migrations, Organizer, AI Presentation, capture, backup, restore or repair;
- does not read Source/Input/Thought body stores;
- does not emit Topic names, Section titles, Entry bodies, Source text, URLs, credentials or durable identifiers;
- closes the database connection after the read.

A running daily extension may independently continue its own normal work; the diagnostic itself does not freeze the whole application.

## What to return

Return only the single object printed after:

`PAIA_READONLY_DIAGNOSTIC`

Do not return screenshots of private content, raw IndexedDB rows, Topic names or IDs.

The aggregate report contains only fields such as:

- `status`, `complete`, `databaseVersion`;
- store-presence booleans;
- Topic / Section / placement counts;
- active / removed / merged / redirected Topic counts;
- invalid compound-index metadata counts;
- actual `byIndex` active-entry count and active-Topic gap;
- missing/invalid active layout generation counts;
- structural Section evidence counts for generation candidates;
- compatibility / AI-productization migration-marker booleans/counters.

## Decision table

### A. `status !== "complete"` or `complete !== true`

Do not merge or deploy. Diagnose why the read-only inspection was unavailable or bounded before allowing a write-capable compatibility pass.

### B. `index.gap > 0` or any `invalidIndexMetadata.* > 0`

This is direct evidence that durable active Topics can be omitted or malformed at the compound-index boundary. Round 2 index compatibility repair is relevant, but the exact counts should be reconciled against the repair's synthetic cases before deployment.

### C. `layouts.missingGeneration > 0` or `layouts.invalidGeneration > 0`

Review the structural candidate split:

- `sequenceWithSection` — a stored `layoutSequence` has matching active Section evidence;
- `legacyOneWithSection` — legacy generation 1 has matching active Section evidence;
- `unresolvedCandidates` — no safe generation can be inferred from the inspected structure;
- `jobBlocked` — a layout job marker prevents automatic inference.

Only the first two are candidates for deterministic repair. `unresolvedCandidates` and `jobBlocked` remain fail-closed.

### D. all structural defect counts are zero

Do not assume the real P0 was imaginary. It would mean the specific B/C compatibility shapes reproduced synthetically are not present **now** in the inspected database. Re-evaluate whether the original incident was transient/read-order/UI-state related before deploying write-capable compatibility repair.

### E. `markers.compatibilityComplete === true`

Stop and investigate before interpreting the report. That marker belongs to the Round 2 repair path; seeing it in the daily database before intended deployment would mean compatibility code has already executed there.

### F. `markers.aiProductizationPresent === false` with unresolved layout candidates

Do not run AI Presentation migration. Review the skipped-unresolved-Topic bookkeeping follow-up first so an unresolved Topic cannot be permanently treated as migrated before it later becomes resolvable.

## Hard prohibitions during this gate

Do not:

- install the repair branch first;
- uninstall/reinstall PAIA;
- clear IndexedDB or extension storage;
- run Original Organizer or AI Organizer as a repair mechanism;
- recreate or merge Topics;
- import history merely to change the database shape;
- restore a backup over the daily database;
- expose private rows to GitHub issues, tests, logs or fixtures.

## Pass condition

This gate passes only after the aggregate report is reviewed and a written decision is made for each nonzero structural defect class. Passing the gate does not itself authorize public Beta; it only allows the current P0 repair to proceed to the next isolated deployment/real-profile validation step.
