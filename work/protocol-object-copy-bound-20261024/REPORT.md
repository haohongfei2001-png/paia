# Bound incoming protocol-object copies before allocation

The original readObject copied the transport-supplied array before comparing its encoded length. An oversized result could cause an additional allocation outside the declared object budget. Transport slice/species overrides could also run during that copy. This is a concrete parser/resource-boundary defect; it is not evidence of a historical CI or capacity cause.

The original reader now uses the intrinsic typed-array byte length, rejects a wrong extent or proxy before allocation, and snapshots exactly the admitted bytes into an ordinary Uint8Array with the original set operation. Digest, decoded length, streaming decompression, codec, reference and all existing limits remain unchanged. No extra request, retry, policy or data migration is introduced. This bounds this reader's own copy; it cannot bound an injected transport's prior allocations.

New four negative/positive cases on original code: 0/4 (before.log). After the fix, three complete files (segments, local-recovery, checkpoints): 53/53, exit 0, no failure/cancel/skip/todo; TAP 2978.26925 ms. Node 22.23.3 on macOS arm64, synthetic in-memory/fake IndexedDB data. Existing long-body, expansion, hash, unknown-codec, causal-tail, pause/deadline and rollback cases remain. No build, browser, large-seed, cloud or Full execution.
