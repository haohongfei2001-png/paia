# AI Context Cards v2 — approved design adoption

Date: 2026-10-07
Design: OWNER_APPROVED
Implementation: NOT_STARTED_BY_THIS_DOCUMENTATION_TASK
Repository baseline: b575ccd9d812b93be9004b73c18eaca8cd4257fd

The product owner approved the four-card AI Context design and requested its conversion into a GitHub development plan. This documentation-only adoption does not start runtime implementation, enable external access, purchase services, authorize model spending, or publish a release.

The approved model is My Information / My Rules / My Now / My Inputs. The first three own independent editable Context Items; My Inputs stores Thought Topic access state without duplicating Topic bodies. Human edits and removals outrank automatic maintenance. Normal external retrieval is limited to allowed Context and allowed Thought Topics, never an Archive fallback. Keep the approved PAIA shell, inline editing, compact access capsules, normal detail pages, and shared connection scope. Do not restore Builder, material-selection, Review, Ready, Package, or permission-console workflows.

The current 0.12.1 retirement of exports, backup generation, BYO API configuration and direct provider transport remains in force. Context execution is currently disabled and a real paid AI service is not implemented; design approval is not evidence that those capabilities exist.

Proposed implementation sequence within Consumer Product v1: CTX4-01 independent data and a persistent My Information vertical slice; CTX4-02 complete local cards and editing; CTX4-03 Topic access; CTX4-04 trusted read-only retrieval; CTX4-05 authorized automatic maintenance; CTX4-06 one real AI connection; CTX4-07 migration, visual and real-use acceptance. Automatic maintenance and real connection gates block only dependent work.

Next implementation task, when implementation is explicitly requested: CPV1-CTX4-01. Preserve all existing source, user-work, revocation and deletion protections. The original prototype's test report is design evidence only, not production certification. No private design-source text, private archive data, credentials, or personal fixtures are included in this adoption record.
