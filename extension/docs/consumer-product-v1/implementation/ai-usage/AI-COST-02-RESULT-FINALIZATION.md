# Separate effective-result finalization in the original ledger

This bounded source successor follows AI_USAGE_PLAN §4 and AI_USAGE_ARCHITECTURE's distinction between actual spend and effective-result quota. It is not a new budget owner, service grant, HTTP action or provider activation. The service's trusted domain-result proof adapter and authenticated client result declaration remain separate integration work.

## Proven gap and operation

After actual usage is settled as VALIDATED, the original settle operation rightly requires byte-identical evidence and refuses a later COMMITTED receipt with SETTLEMENT_CONFLICT. Three such jobs retain all three provisional Free result slots indefinitely. Repricing or rewriting the original usage receipt would break the immutable financial contract; calling schema success COMMITTED would falsely claim a domain result.

The new original-owner finalizeResult operation accepts a separate exact metadata receipt only through a distinct constructor-supplied verifyResult capability. It requires verifiedResultFacts plus exact current request/evidence bindings, inside the same original serialized ledger transaction and current authority/clock/window checks. A schema-valid provider body or HTTP boolean cannot satisfy this proof. Missing proof fails closed; existing services do not automatically install one.

Only child zero records additive resultResolution/resultResolvedAt metadata in the existing row. Every actual child and its immutable usage receipt is bound. COMMITTED requires all planned children to exist with known VALIDATED spend; FAILED may include known failed/cancelled children and uncreated children, but never unknown or pending financial occupation. A terminal result prevents later sibling reservations. The original settlement, price, spend, operation state and physical-attempt history are unchanged. Same receipt replay is idempotent; conflict, cross-job receipt reuse and child/identity rebinding are rejected.

A committed result records its actual finalization time/day, retaining the original rolling-day and declared-zone quota protections. A proven failed domain result releases only the provisional effective-result slot, never charged money/attempts. Old COMMITTED financial receipts still work without conversion. Old rows without result metadata remain unchanged. Every later original transaction validates new result metadata and its complete child links before interpreting quota. No new store or physical SQL table is introduced.

## Development evidence

Two new original-owner tests first failed because finalizeResult did not exist. The original immutable-settlement conflict is retained as an explicit control, alongside rollback/lost ACK, independent instances, duplicate/conflicting proofs, incomplete/failed/unknown/cancelled children, body/extra fields, request rebinding, mutation during held proof, receipt reuse, delayed completion, timezone change, terminal sibling prevention and persisted-history corruption. All fixtures and verifier capabilities are explicitly synthetic. Actual HTTP, PostgreSQL publication and authentic domain proof are not exercised by these owner tests.

The exact candidate, final scoped counts and independent review belong to the integration record. This slice does not close overall service or product implementation, activate any route, mutate a user database or replace deferred broad acceptance.

## Independent orphan-history repair

Independent review of `b68de76ee32dee81fa9f90478ab0205d76ddf441` reproduced deletion of only resultResolution after a FAILED result, leaving resultResolvedAt. The old no-anchor shortcut then admitted a previously uncreated sibling. The successor requires the two additive finalization fields to be present together before that shortcut. Original legacy rows with neither field remain accepted. Four owning missing-field controls and the unchanged independent reproducer exercise COMMITTED/FAILED histories without claiming arbitrary database tampering can be reconstructed after all evidence is erased.
