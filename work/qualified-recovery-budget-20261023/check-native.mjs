import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';
import {nativeQualifiedHumanBudgetFixture,QUALIFIED_HUMAN_BUDGET_CASES} from '../../extension/tests/native-sync/qualified-human-budget-fixture.mjs';
const owning=await readFile('extension/tests/qualified-human-recovery-budget.test.mjs','utf8'),helpers=await readFile('extension/tests/harness/thought-m1.mjs','utf8');
const output=nativeQualifiedHumanBudgetFixture(owning,helpers,'qualified-human-budget-matrix');assert.equal(QUALIFIED_HUMAN_BUDGET_CASES.length,32);assert.equal(output.includes('const selected=cases;'),true);assert.equal(output.includes('new IDBFactory'),false);assert.equal(output.includes('count<=3'),true);assert.equal(/node:|fake-indexeddb/.test(output),false);
// Case bodies are retained byte-for-byte except original factory/constructor
// boundaries, which select real native IndexedDB and preserve all options.
const begin="for(const count of [1,2,3])test(",before=owning.slice(owning.indexOf(begin));const transformed=before.replaceAll('new LibraryDocumentsStore(','nativeStore(').replaceAll('new ArchiveRepository(','nativeRepository(').replaceAll('new IDBFactory()','nativeFactory()');assert.equal(output.includes(transformed),true);
await writeFile('work/qualified-recovery-budget-20261023/qualified-human-budget-matrix.mjs',output);console.log(JSON.stringify({caseCount:32,originalCaseBodiesPreserved:true,nativeFactory:true,executedCallbacks:0,browserExecuted:false,buildExecuted:false}));
