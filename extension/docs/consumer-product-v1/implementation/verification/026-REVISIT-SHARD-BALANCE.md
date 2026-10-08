# Whole-file Reader/Revisit shard balance

PR210 head b109041c Full run37811945027 ended FAILURE. Browser4 job113430791904
was CANCELLED after18m21s despite its test output and evidence upload completing;
this remains negative job evidence, not a certification pass. Other six browser
jobs succeeded. The Mac discard failure is separate and still under diagnosis.

Move only `ux-r2-reader-revisit-chrome-e2e.test.mjs` from4/7 to1/7. Its complete
nine-case file cost approximately4m20s in the failed run; shard1 finished in12m08s.
This reduces the overloaded job without adding a job, splitting a file,
removing a case, increasing a timeout or changing assertions. All84 current
browser files remain covered exactly once; historical4/5/6-way routes remain
unchanged. The frozen routing contract keeps every other expected placement and
now explicitly records this one measured seven-way move.

Three complete routing/setup contract files:4/4 PASS,53.061ms. Independent review compared all336 file/partition placements: exactly this one
seven-way move changed and the other335 stayed identical. Review APPROVED.
The next coherent candidate hosted run remains pending; no unchanged rerun is
requested solely to check this routing edit.

## Separate strict CI inventory correction

Candidate a9efb167 run37816144963 Browser1 stopped before browser execution:
`D5_SEVEN_SHIFTED_UNREVIEWED_ROUTING:ux-r2-reader-revisit-chrome-e2e.test.mjs`.
The coordinator had updated the routing and its unit inventory but missed the
separate strict expected mapping in `check-ui-refresh-ci.mjs`. That failure is
retained and is not runtime-test evidence. Add the identical one-file4→1 exception
there; all other mappings, file inventory and budgets remain asserted. Running
the complete actual CI script locally now prints
`CURRENT_BROWSER_COVERAGE_CONTRACT_PASS core=11 uir=10 ans=11 cpr=3`.
Independent review APPROVED and independently ran the same complete CI script. Do not rerun the unchanged failing head.
