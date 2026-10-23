# Qualified recovery committed control accounting

Implementation: `6cd36385`, parent `ea0260aa`.

The exact design, boundaries, independent review and every invocation appear in the appended **Strict committed control accounting follow-up** section of `REPORT.md`. `control-invocations.json` records the individual TAP outcomes; `control-source-vector.json` binds the final sources. The final dedicated result is 32/32; the later 65/65 is a combined count of 32 budget + 27 repository-gate + 6 manifest-cold small tests. It is not a 65-group execution.

`control-evidence-index.json` explicitly distinguishes historical 23-case preparation at commit `ea0260aa` from current 32-case preparation. The old `native-preparation.json` remains unchanged and describes only 23-case preparation. Earlier report references to native registration, generated module, preparation scripts and source-vector mean their exact `ea0260aa` blobs and hashes recorded in the index. They do not certify the subsequently updated 32-case files. Current artifacts have `control-` prefixes. Neither native preparation executed any browser case.

No 65/129-group probe, original phased-stage owning file, browser, build, CI or cloud run occurred in this follow-up. Root alone retains the unique original-scale execution opportunity. All failed and cancelled local invocations are preserved. Failed pre-admission transactions remain independently bounded; the ledger does not claim durable billing of every rolled-back failure across arbitrary process restarts. Committed graph control and genuine dependent reads are included in cumulative task accounting.
