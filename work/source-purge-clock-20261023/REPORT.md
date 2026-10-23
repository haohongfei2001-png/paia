# Permanent Source tombstone clock correction

The original writer read its clock twice. With a strictly increasing clock its sequence timestamp differed from deletedAt, so the existing exact tombstone guard rejected a legitimate complete checkpoint. The writer now reads one instant and uses it in both fields. No receiving guard or budget changes.

The new small owning test retains original two-Source capture, permanent purge and cleanup, complete checkpoint export/receive, and refusal of the deleted Source with full physical-table equality. Before the fix: 0/1, sequence 1792713600011 versus deletedAt 1792713600012. After: 1/1, exit 0, TAP 466.594167 ms; Node 22.23.3, macOS synthetic IndexedDB.

Execution was on base 1fda4d3e plus the in-progress Working/negative consumer delta. This case contains no Working operation and follows the existing bootstrap/negative path. Those uncommitted Working changes are excluded from this narrow commit. Original native allowlists are unchanged. No browser, build, cloud or large data run.
