import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
test('capture package guard admits exact captured API identity and rejects expanded access',()=>{
 const output=execFileSync(process.env.PYTHON||'python3',['-c',`
import sys
sys.path.insert(0,'scripts')
import check_package as c
path=c.ROOT/'background/capture-recovery.js'; source=path.read_text(); count=0
c.ERRORS.clear(); c.audit_js(path,source); assert not c.ERRORS,c.ERRORS; count+=1
cases=[source+'\\nchrome.scripting.executeScript({});',source+'\\nscripting.executeScript({});',source+'\\nscripting["executeScript"]({});',source.replace('const scripting = chrome.scripting,','const scripting = alternate,'),source.replace('chrome.scripting === scripting &&','true &&'),source+'\\nconst scripting = chrome.scripting, tabs = chrome.tabs, runtime = chrome.runtime;',source.replace('apply(execute, scripting, [{','apply(alternate, scripting, [{',1),source+'\\nchrome.history.search({});',source+'\\nexecute.call(scripting,{});',source+'\\nReflect.apply(execute,scripting,[{}]);',source+'\\nconst extra=scripting; extra.executeScript({});']
for candidate in cases:
 c.ERRORS.clear(); c.audit_js(path,candidate); assert c.ERRORS,'expanded capture access accepted'; count+=1
c.ERRORS.clear(); c.audit_js(c.ROOT/'background/unrelated.js',source); assert c.ERRORS; count+=1
print(count)
`],{cwd:new URL('../',import.meta.url),encoding:'utf8'});assert.equal(output.trim(),'13');
});
