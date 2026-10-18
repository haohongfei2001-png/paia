import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
test('original package guard retains exact Context source exemptions and rejects injected extra access',()=>{
 const output=execFileSync('python3',['-c',`
import sys
from pathlib import Path
sys.path.insert(0,'scripts')
import check_package as c
native=c.ROOT/'background/context-connections.js'; ui=c.ROOT/'ui/context-connections-view.js'
checks=0
for path in [native,ui]:
 text=path.read_text(); c.ERRORS.clear(); c.audit_js(path,text); assert not c.ERRORS, c.ERRORS; checks+=1
sources=[(native,native.read_text()+'\\nthis.#api.runtime.connectNative(HOST);'),(native,native.read_text().replace("const HOST='com.paia.context_read'","const HOST='com.paia.secure_store'")),(native,native.read_text()+'\\nchrome.runtime.connectNative("other");'),(ui,ui.read_text()+'\\nnavigator.clipboard.readText();'),(ui,ui.read_text()+'\\nnavigator.clipboard.writeText(value);')]
for path,text in sources:
 c.ERRORS.clear(); c.audit_js(path,text); assert c.ERRORS, str(path); checks+=1
print(checks)
`],{cwd:new URL('../',import.meta.url),encoding:'utf8'});assert.equal(output.trim(),'7');
});
