import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const file='extension/tests/qualified-human-recovery-budget.test.mjs',source=await readFile(file,'utf8');
const inert=source.replace(/import\s+[^;]+?\s+from\s+['"][^'"]+['"];?/g,'').replace('globalThis.IDBKeyRange=IDBKeyRange;','');
assert.equal(/\bimport\b|node:test/.test(inert),false);const names=[];Function('test',inert)((name,fn)=>{assert.equal(typeof fn,'function');names.push(name);});assert.equal(names.length,23);assert.equal(new Set(names).size,23);assert.equal(names.some(x=>/(?:^|[^0-9])(?:65|129)(?:[^0-9]|$)/.test(x)),false);
const path='extension/tests/native-sync/qualified-human-budget-fixture.mjs',body=(await readFile(path,'utf8')).split('// Prepared only:')[1];assert.ok(body);await writeFile(path,'export const QUALIFIED_HUMAN_BUDGET_CASES=Object.freeze('+JSON.stringify(names,null,2)+');\n'+'// Prepared only:'+body);
await writeFile('work/qualified-recovery-budget-20261023/native-registration.json',JSON.stringify({executedCallbacks:0,count:names.length,names},null,2)+'\n');
