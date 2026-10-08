# 0.28 measured browser balance correction

Exact candidate `76db8d6f` Full37830791787 is not a pass. Six browser jobs and all unit/privacy/build/native/Mac jobs passed; Browser1 was cancelled at its unchanged18-minute budget. Prompt37830791928 and Visual37830791633 passed independently. Raw failure: `work/028-browser1-budget-cancel.log`.

Browser1 reported49 PASS and no FAIL before cancellation, including all nine Reader/Revisit cases. Two tail files (`ux-r3-history-preemption`, `ux-r5-ai-update`) were not reported and are not certified by this job. Reader/Revisit consumed257.3 seconds after approximately846.1 seconds in earlier files. The prior4→1 placement relied on an older12m08 sample and is insufficient for the current workload; preserve that failed scheduling decision.

Move only the complete Reader/Revisit file from1 to6 at width7. Current group6 native time636.4s plus257.3s is approximately893.7s; its measured whole job11m25 yields an estimated15m42 after the move, leaving about2m18 of the existing18m limit. This is a scheduling estimate, not a passing result. Group3 was a measured slower alternative (native674s). All84 files, all case assertions, widths4/5/6, historical fixture snapshots, seven workers, per-job concurrency and budgets remain unchanged. Update both live routing owners and all six historical compatibility oracles explicitly for this one route; do not alter their frozen history.

The final candidate must pass new full certification. No runtime, version, deployment or installation change is made.

Independent review compares all336 actual width4/5/6/7 routes against76db: exactly one changed (ReaderRevisit width7,1→6);335 remain identical. Six complete historical guard files17/17 PASS135.116ms and the actual CI coverage script PASS, `/tmp/028-balance-independent.log`. Frozen fixtures, runtime and workflow budgets are unchanged. The two tail files have no completion result; the log does not prove whether their processes had started.
