# Preserve latest website main and repair one malformed local ref

Remote main0ce10a79 advances9d720055 by one commit and changes29 website/document paths. A normal two-parent merge preserves all29 exact main blobs and has no extension delta. No main/PR313 update, website deployment or website validation is claimed. The extension's preceding local validation retains its exact earlier source identities.

Initial fetch failed with `bad object refs/heads/codex/phased-work-accounting-20261023 2`. A read-only ref-name inventory found exactly one invalid name. Its41 raw bytes point to an existing commit, different from the normal branch. The complete bytes were copied and verified in the Git metadata quarantine, and a new valid local preserved ref was created for that commit before removing only the invalid name. The normal branch ref is unchanged. No reset, cleanup, stash mutation or worktree content removal occurred. The quarantine remains recoverable; cause of the invalid duplicate is UNKNOWN.

Subsequent original fetch and connectivity-only Git fsck succeeded. repair.json and preservation.json record exact hashes, paths and identities. Concurrent task branches were not modified. PR313 remains02144bcc.
