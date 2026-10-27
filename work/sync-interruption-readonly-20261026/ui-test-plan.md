# Read-only Sync UI — finite local plan

Runtime base: 397d9797ddb28d0a3f54857d4df4d835c7819c2d.
Owned source: new extension/ui/settings-sync-recovery.js; tiny import/mount wiring in original exact-HEAD extension/ui/settings-details.js.
Owned test: new extension/tests/settings-sync-interruption-readonly.test.mjs.

Only execution: `node --test extension/tests/settings-sync-interruption-readonly.test.mjs`, stdout/stderr and exit status retained with distinct attempt filenames. Tests use production presenter/controller and a new synthetic DOM fake; no old suite, browser, network/provider, account, database writes or publication. No timeout/threshold/permission/configuration change.

Cases: strict worker `{ok:true,data:{version:1,state}}` envelope and known states; unavailable/null-production presentation; interrupted prepared/outcome-unknown/finishing accounting and deadline limitations; selected is local selection only, not cloud or whole-archive success; suspicious extra capability/body fields not rendered or acted on; mount does not read, first Data row and single original detail owner; opening and Refresh invoke only PAIA_GENERATION_STATUS; no polling; late newer request/Close/hidden dialog/panel/group/document response invalidation; stale UNKNOWN survives failed refresh as explicitly last observed; language change never dispatches or steals focus; native close ownership and tiny Settings source wiring.

Review refinement before attempt 2: unavailable does not imply one specific missing prerequisite. Add a finite UNKNOWN → unavailable control preserving the earlier result as explicitly last-observed, then execute only this newly authored UI file again; attempt 1 is retained unchanged.

After attempt 2 had already completed, parent refined verification to avoid repeating already-passing new controls. Prepared marker alone does not prove host interruption: change only its title and matching prior expectations, add one fresh title/limitation check, then execute only `--test-name-pattern='^prepared receipt copy does not infer interruption or successful recovery$'`. Final evidence separates earlier whole-new-file hashes from this targeted final-byte check. Actual browser focus, visual/source-release/installation acceptance are NOT_RUN.

## Same-entry singleflight defect closure — authorized after 01370f67

Prior source/test exact bytes are archived under `ui-before-singleflight-*` with SHA256. Keep one actual pending STATUS request until its promise settles; view Close/hide invalidation must not release it. Disable/label Refresh while pending, preserve explicit-only post-settlement reading and suppress stale settled results. Modify the two earlier overlap-expecting cases and add three panel/group/dialog hide→reopen→rejection controls. Execute only `node --test --test-name-pattern='^singleflight ' extension/tests/settings-sync-interruption-readonly.test.mjs`; no full-file or prior-case replay. Retain all prior evidence; no protocol, retry, polling or deadline changes.
