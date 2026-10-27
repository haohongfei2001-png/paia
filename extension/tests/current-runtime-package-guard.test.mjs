import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

const audit = code => execFileSync(process.env.PYTHON || 'python3', ['-c', String.raw`
import sys
sys.path.insert(0, 'scripts')
import check_package as c
def errors(path, source):
 c.ERRORS.clear()
 c.audit_js(path, source)
 return list(c.ERRORS)
` + code], {cwd: new URL('../', import.meta.url), encoding: 'utf8'}).trim();

test('package import keywords exclude quoted schema and local-import identities without losing real references', () => {
 assert.equal(audit(String.raw`
path=c.ROOT/'core/example.js'
references=[]
original=c.local_reference
c.local_reference=lambda reference,*args:references.append(reference)
source="const kinds=['local-import','from','import','native-import']; const double=[\"local-import\",\"from\"]; const template=\x60local-import\x60; import './a.js'; import x from\"./b.js\"; export {x} from './c.js'; const y=import('./d.js');"
assert not errors(path,source)
assert references==['./a.js','./b.js','./c.js','./d.js'],references
c.local_reference=original
for source in ["import './not-packaged.js';", "import x from\"./not-packaged.js\";", "export {x} from './not-packaged.js';", "import('./not-packaged.js');", "import(moduleName);"]:
 assert errors(path,source),source
print('import controls passed')
`), 'import controls passed');
});

test('capture package guard admits only the original API identity and pinned dispatches', () => {
 assert.equal(audit(String.raw`
path=c.ROOT/'background/capture-recovery.js';source=path.read_text()
assert not errors(path,source),c.ERRORS
cases=[source+'\nchrome.scripting.executeScript({});',source+'\nscripting.executeScript({});',source+'\nscripting["executeScript"]({});',source.replace('const scripting = chrome.scripting,','const scripting = alternate,'),source.replace('chrome.scripting === scripting &&','true &&'),source+'\nconst scripting = chrome.scripting, tabs = chrome.tabs, runtime = chrome.runtime;',source.replace('apply(execute, scripting, [{','apply(alternate, scripting, [{',1),source+'\nchrome.history.search({});',source+'\nchrome.cookies.getAll({});',source+'\nexecute.call(scripting,{});',source+'\nReflect.apply(execute,scripting,[{}]);',source+'\nconst extra=scripting; extra.executeScript({});']
for candidate in cases:
 assert errors(path,candidate),'expanded capture access accepted'
assert errors(c.ROOT/'background/unrelated.js',source)
print('capture controls passed')
`), 'capture controls passed');
});

test('only existing injected Sync adapters retain their exact URL inventory without network or scope expansion', () => {
 assert.equal(audit(String.raw`
for name in ['google-drive.js','onedrive.js']:
 path=c.ROOT/'core/browser-native-sync/providers'/name;source=path.read_text()
 assert not errors(path,source),(name,c.ERRORS)
 candidates=[source.replace('www.googleapis.com','evil.example').replace('graph.microsoft.com','evil.example'),source+"\nconst x='https://www.googleapis.com/auth/drive';",source+'\n'+source,source+"\nfetch('https://chatgpt.com');",source+'\nchrome.identity.getAuthToken();',source.replace('/drive/v3/files','/drive/v3/changes').replace('/v1.0/me/drive','/v1.0/me/drive/root'),source.replace('https://','http://')]
 for candidate in candidates:
  assert errors(path,candidate),(name,'expanded provider access accepted')
 assert errors(c.ROOT/'core/unreviewed.js',source)
print('provider controls passed')
`), 'provider controls passed');
});
