# 0.55.21 immutable Topic-result correction — local candidate

0.55.20 first automatic CI completed: Pages and Maintenance succeeded; Certification and Prompt each failed only their Unit 1 case “Context receives immutable actual same-child Topic result only after exact ACK”. The certification aggregate gate failed as a consequence. Other actual jobs succeeded. No workflow was retried.

The exact defect was the new Context adapter projection introduced to hide private createdEntryIds: its two-field outer object was not frozen, although the internal original result and topicIds remained frozen. The unchanged adapter assertion correctly failed and the facet returned PARTIAL rather than COMMITTED. This is a runtime compatibility regression, not a stale test expectation.

The one-line runtime correction applies Object.freeze to exactly {outcome,topicIds}. It preserves the original same-child and exact-ACK-before-exposure rules and continues to exclude private createdEntryIds. No test, authorization, grant, payload fields, defaults, quota, schema, workflow or site is changed. Manifest version, displayed version_name and package version are consistently 0.55.21.

The unchanged affected original owning case was selected by its exact name and executed once on runtime commit 8b038afa: 1/1 PASS, no failures/skips (Node v24.19.0). No other case, old full suite, native browser, real service or cloud run was repeated. The original failures and local result remain separate. This candidate has not been published and changed-head whole CI is not yet established.
