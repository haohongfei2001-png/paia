# SET2 — existing removed-content entry labels

Base: `71c747f2`. This narrow follow-up translates four existing Settings secondary controls: the removed-thought disclosure, removed Topics, removed content, and pending/removed inputs. Their original Chinese text remains unchanged. English text is supplied through the existing `data-settings-zh/en` and `syncSettingsCopy` owner; no JavaScript, RPC, recovery, navigation, focus, or storage behavior changes.

The owning unit reads the actual four elements from `archive.html` and invokes the production copy function in both language directions. Before the fix all four labels stayed Chinese in English: `/tmp/settings-removed-entry-negative.log` (1 failure). An earlier static-import fixture error (`document` unavailable) is retained separately in `/tmp/settings-removed-entry-before.log`; it is not product evidence. After adding the attributes, the complete new owner, removed-locale, history-locale, and Settings system-presentation files pass 17/17, with zero skipped/cancelled: `/tmp/settings-removed-entry-final.log` (90.297459 ms). The checks preserve control identity, focus, click listeners and disabled state. `git diff --check` passes.

Current bytes:
- `ui/archive.html`: SHA256 `0e1689a005d85e746cbc9924025fb35a2ae1ef809df34140bec5a74f4d2ef129`
- `tests/settings-removed-entry-labels.test.mjs`: SHA256 `bda169ba15e8f59aceac584888994f3d0c4eaa5f6f187c0facfa760694b33ffe`

The coordinator's populated compact English Placement screenshot exposed the original gap. That owning native file remains coordinator-owned; the current markup still needs its combined source/release visual verification. These units do not establish complete Settings localization or overall SET2 acceptance.

Independent coordinator review approved the four existing-owner attributes and new test; an independent complete owning-file run passed 1/1 (53.214833 ms). Coordinator will integrate the markup and verify all four English labels in the existing whole Placement native file, with source/release screenshots. No duplicate browser run is claimed here.
