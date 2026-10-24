# Human pending-search completeness: isolated third package

## Result and identity

The original production grouped exporter admitted a physically missing required Human search locator. The minimal original-owner negative control reproduced this separately for Entry, Topic and Section. No mock owner, forged success capability or seven-file automatic-Context WIP was used.

- Exact baseline: `f0f7e072d945581216d2c93fe62f38a73cc2205f`.
- Cloud branch: `codex/dot-cloud-human-search-completeness-20261024`.
- Runtime: `extension/core/browser-native-sync/human-library-scope.js` only.
- Test: `extension/tests/human-scope-search-completeness.test.mjs` only.
- Environment: Node `v24.19.0`, cloud Linux x86_64, repository fake IndexedDB and synthetic in-memory transport. Not Node 22, macOS, native browser, CI or account evidence.
- First package's worktree/commit remains unchanged. No push, PR, version, dependency, lockfile or deployment change.

## Reproduction and exact safety contract

Real `HumanLibrarySyncJournal` owners create an Entry, Topic and default Section. The test independently reconstructs their three locators through original `planSearchQueueLocator` and verifies the complete physical queue. It then deletes one actual `libraryMigrationItems` row, retaining every canonical body and protocol operation, and calls original `buildCheckpoint(core, transport, {grouped:{store}})`.

At baseline, all three missing-row variants returned successfully. The unchanged queue positive control passed. The original four-test source and failing log are preserved as `missing-locator-original-red.test.mjs` and `missing-locator-original-red.log`: 1 pass, 3 fail, exit 1. This is not an original automatic-Context scale rerun.

`requireHumanScope` previously checked each existing migration row, but never checked that all Human search owners were represented. `requireGroupScope` delegates `libraryMigrationItems` to that owner. Original `queueSearch` creates a locator with the owner revision; original `searchBatch` removes it only while recording indexed completion. The affected generic profile already rejects indexed owner fields, postings, partial progress and unrelated migration derivatives. Thus an absent locator is not a legitimate accepted intermediate state in this profile.

The fix tracks references to the already private expected Entry/Topic/Section rows. Every existing exact locator consumes its own owner once. Any remaining owner rejects with the existing `BNS_GROUP_CANONICAL_UNREPRESENTED`. The existing full scan, shape/version/source checks and failure code remain. No entity read, storage write, budget adjustment, blanket table count or final-fence removal was added.

## Legitimate partitions retained

- The native projection early return is unchanged; no native-linked admission was added.
- Exact original Saved partition IDs remain handled by the Saved owner and are not counted as Human owners. A genuine Saved + Human fixture with two physical tasks passes; deleting only its Human task rejects while the Saved task remains.
- Existing source-linked generic Human support retains original nonempty Source IDs; genuine supported linked creation passes, its missing locator rejects.
- A genuinely removed Human Entry still owes its actual pending locator and passes with it.
- Real `searchBatch` partial-write and completed states still reject in the old pending-only generic exporter. This does not make those ordinary search states invalid elsewhere and does not change their existing native qualification path.
- Unknown migration rows, wrong version, partial phase, nonzero offset, extra fields and same-count foreign-owner replacement continue to reject.
- A delete followed by unrelated writes inside one real transaction rejects through the original scope and rolls back all stores.

Adjacent limitation: `requireSavedWorkScope` in `saved-work-bootstrap.js` also validates its existing queue rows without proving every Saved locator exists. This package does not modify that owner or claim to close Saved completeness. No Saved-only missing-row reproduction was run.

## Verification

All commands ran from the isolated third-package worktree. No dependencies were installed.

1. Baseline red: `node --test extension/tests/human-scope-search-completeness.test.mjs`, four-test pre-fix source, 1/4 pass, 3 failures, exit 1; `missing-locator-original-red.log`.
2. Minimal fixed check: same command, four-test source, 4/4 pass, exit 0; `missing-locator-fixed-first.log`.
3. Final complete new owning file: same command, 19/19 pass, no fail/cancel/skip/todo, 2074.948606 ms; `search-completeness-owning-first.log`.
4. Complete existing owning regressions: `node --test extension/tests/browser-native-sync-human-library-group.test.mjs extension/tests/human-source-entry-plan.test.mjs extension/tests/human-source-placement.test.mjs extension/tests/browser-native-sync-saved-mixed.test.mjs extension/tests/browser-native-sync-human-library-search-proof.test.mjs`, 52/52 pass, no fail/cancel/skip/todo, 8901.934111 ms; `search-owner-regressions.log`.
5. `node --check` on both modified files and `git diff --check`: pass.

The complete source-entry owner file includes small 65/128/129-row suppression-pagination cases. These are not the exhausted 129-group recovery profile. No 129-group recovery, 100k, Full, cloud/native diagnosis or original failed automatic round-trip was run.

Frozen SHA256:

- Runtime: `72f3c2e3dac4e09077854ba18b89f1b03288387234f7b0103144831db442a839`
- Test: `f8da36492dd988c737697bbf9a874112c792849720f82b5c342de3f5257c7029`
- Baseline runtime: `7e586099318ddb55a2514788e00b09edfd14ec21e1eaadfcc07beb626cf619c2`
- Original red test: `65fbc7b65ff7e806defb6c4a1ef26edda6e0f42f369614966a6cdbed220c25c1`
- Original red log: `ce960c232da3436d7aab052d4fcf042d2cab0d4a00a7766d3d4af855ddee8269`
- Final owning log: `d45e23b9738fa32d5bd9ca4b87d85d56fda1960820f55a483f32eadc772df1fd`
- Existing regression log: `1e38e09ec30527b23891e6760ca64cc74b5add0bdd1e6b645cf6f32715d9cb87`

## Seven-runtime automatic WIP: causal dependency map, read-only

The unfinished WIP is only commit `c9fcc034fcd81f29089a7b17f67b205a37aad6a6` versus parent `12509bc2f665cc516cf94df3889f74589508b867`. It is not the entire diverged branch. All four original failures remain authoritative, including terminal-fence refusal at 3454 refs, 2099146 bytes and about 237 ms against the unchanged 2 MiB budget. First-package deduplication and this integrity patch do not establish automatic activation success.

The smallest reviewable chain is:

1. **Working application lifetime**, waiting for recovery ownership to freeze. Exact `input-working-commit.js` release primitive plus the `group-checkpoint.js` preparation-order/`try/finally`/`return await` lifetime slice. Genuine Human-preparation rejection must dispose already prepared caps; successful and late-abort paths must also dispose them. Baseline Human-first ordering is not itself a demonstrated leak. Do not integrate an unused release helper alone.
2. **Linked causal producer and future Source/Working view**, after lifetime proof. `group-checkpoint-plan.js` must bind every source link to the exact Source identities and actual Working content-revision producer, not merely an Input ID. `input-working-commit.js` must project from a genuine store/core/group-bound private application, preserve exact Source closure and require consecutive Input/content revisions. `human-library-plan.js` and `human-library-group.js` must dispatch the actual producers and advance original history/counters/Source rows before compiling the linked Human owner. Require missing/foreign/reused/stale cap, different Source, same Input wrong revision, and post-link Working negative controls. Adding graph kinds alone is not a usable or safe package.
3. **Future evidence epoch and final generic scope**, alongside the future view. The WIP increments the future epoch once per Working operation and derives the scope epoch from the exact plan's Working count. That requires proving the accepted cold profile's initial epoch, exact invalidation multiplicity and all old generic/restored consumers. Destination pre-replay sampling and unchecked caller numbers are not equivalent. The `group-checkpoint-scope.js`/`human-library-scope.js` epoch delta must remain coupled to the proven profile; this third-package locator fix does not install it.
4. **Combined generic Context restore closure**, only after 1–3. Real Context owner ordering must consume final Source/Working/Human values; all original terminal fences and resource accounting stay. Full all-table semantic comparison and actual search results are needed, not only `readContextCards` equality in `tests/harness/context-mutation-shadow.mjs:40,42`. A/B/C physical snapshots cannot be naively byte-equal because local keys, history allocation and original derivative phases differ. Normalize only fields justified by original owner mappings and separately prove queue/posting/reader results. Do not reduce the original case or rerun the exhausted profile to produce a claim now.
5. **Native currentMixed linked qualification**, a separate later closed package, not unlocked by 1–4. Keep every native-linked guard until the following existing-owner prerequisites compose under the same original work ticket.

Native prerequisites identified in current code:

- `human-library-plan.js:1633–1634`: mixed native primary capture currently has zero allowance for provenance/dependencies; the existing 37-store/110-index whole cut and key/value consistency must include these rows, not receive a second caller DTO. Extend actual raw/expected/crypto/semantic comparison metering, not budgets.
- `human-library-scope.js:34`: native source links are refused. A future implementation must bind secret, Source identity, content revision and evidence epoch to the same authenticated native cut, recheck each asynchronous boundary, and compare exact generated provenance/dependency/suppression rows. Existing `sourceLinkedDescriptor`, original evidence construction and Source physical qualification are ingredients, not native authority by themselves.
- `human-library-plan.js:1333–1335,1376`: provenance and source references are explicitly excluded. Original Source/Working canonical, tombstone/eligibility and linked Human evidence owners must jointly prove closure before any exclusion changes.
- The native query reconstruction currently uses the source-free reader profile and null Source times. Linked reader semantics require original Source presence/time/evidence/activity construction and exact Root/Topic/receipt ordering, including old retained projection generations; deleting source checks would not supply these values.
- `human-library-search-proof.js:29`: source-free eligibility is explicit. Existing `planSearchQueueLocator`, `planSearchPostings` and `planSearchPostingRow` can construct exact derivatives, but the same-cut Source eligibility and actual ordinary search semantics must be proved before accepting linked owners. Preserve exact pending/completed distinction, full migration inventory and no missing or foreign postings.
- Current mixed Human body comparison omits provenance/dependencies because the profile has already refused them. Their whole-table equality, original mappings/physical allocations, all unknown metadata refusal and Context lineage currentness must become part of one proof, not separate permissive exemptions.
- Preserve native budget/capability cleanup and observed failures. The present task has no authority to launch another native/Full/cloud/scale validation, so no native acceptance can be claimed.

No other automatic-WIP runtime slice is independently executable with its actual consumer while `group-checkpoint.js` remains locked. This third package closes an independently reachable existing-owner integrity hole without opening the unfinished automatic/native profile.
