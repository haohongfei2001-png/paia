import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('S4 package guard requires real local toolbar wiring and retains every permission bound',()=>{
 const output=execFileSync('python3',['-c',String.raw`
import ast,copy,json,re,tempfile
from pathlib import Path
from urllib.parse import unquote,urlsplit
source=Path.cwd();original=json.loads((source/'manifest.json').read_text())
tree=ast.parse((source/'scripts/check_package.py').read_text())
names={'require','local_reference','icon_references','audit_manifest'}
functions=[node for node in tree.body if isinstance(node,ast.FunctionDef) and node.name in names]
with tempfile.TemporaryDirectory(prefix='paia-toolbar-manifest-') as folder:
 root=Path(folder).resolve()
 # Synthetic local files exercise the actual reference guard without copying
 # or modifying the user's source tree. This is static wiring evidence only.
 def resources(value):
  if isinstance(value,dict):
   for item in value.values():resources(item)
  elif isinstance(value,list):
   for item in value:resources(item)
  elif isinstance(value,str) and re.fullmatch(r'[A-Za-z0-9_./-]+\.(?:js|css|html|png)',value):
   path=root/value;path.parent.mkdir(parents=True,exist_ok=True);path.write_text('')
 resources(original)
 for name in ['ui/archive.html','ui/popup.html','background/toolbar-entry.js']:
  path=root/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_text('')
 worker=root/'background/service-worker.js';archive=root/'ui/archive.js'
 env={'ROOT':root,'ERRORS':[],'CHECKS':0,'json':json,'re':re,'unquote':unquote,'urlsplit':urlsplit}
 exec(compile(ast.Module(body=functions,type_ignores=[]),'actual-manifest-audit','exec'),env)
 valid="import {installToolbarEntry} from './toolbar-entry.js';\ninstallToolbarEntry(chrome,{clients:globalThis.clients});\n"
 client="import {installToolbarClient} from '../background/toolbar-entry.js';\ninstallToolbarClient(chrome);\n"
 archive.write_text(client)
 replacement=copy.deepcopy(original);replacement['action'].pop('default_popup',None)
 rows=[]
 def check(name,manifest,text,expected):
  (root/'manifest.json').write_text(json.dumps(manifest));worker.write_text(text);env['ERRORS'].clear();env['audit_manifest']()
  passed=not env['ERRORS'];assert passed==expected,(name,env['ERRORS']);rows.append({'case':name,'accepted':passed})
 legacy=copy.deepcopy(original);legacy['action']['default_popup']='ui/popup.html'
 check('legacy-popup',legacy,'',True)
 check('reviewed-toolbar',replacement,valid,True)
 check('quoted-URL-wildcard',replacement,'const scope="https://chatgpt.com/*";\n'+valid,True)
 check('quoted-comment-markers',replacement,"const marker='/* not comment */';\n"+valid,True)
 check('quoted-multiline-worker-hook',replacement,'const inert='+chr(34)+chr(92)+'\n'+valid.replace('\n',chr(92)+'\n')+chr(34)+';',False)
 check('template-worker-hook',replacement,'const inert=String.raw'+chr(96)+'\n'+valid+chr(96)+';',False)
 check('missing-hook',replacement,'',False)
 check('comment-only-hook',replacement,'// '+valid.replace('\n','\n// '),False)
 check('block-comment-worker-hook',replacement,'/*\n'+valid+'*/',False)
 check('wrong-clients-owner',replacement,valid.replace('globalThis.clients','foreignClients'),False)
 wider=copy.deepcopy(replacement);wider['permissions'].append('tabs');check('wider-tabs-permission',wider,valid,False)
 foreign=copy.deepcopy(replacement);foreign['background']['service_worker']='background/other.js';(root/'background/other.js').write_text('');check('foreign-worker',foreign,valid,False)
 empty=copy.deepcopy(replacement);empty['action']['default_popup']='';check('empty-popup-not-cutover',empty,valid,False)
 for name,text in [('missing-Archive-listener',''),('block-comment-Archive-listener','/*\n'+client+'*/'),('commented-Archive-listener','// '+client.replace('\n','\n// ')),('wrong-Archive-owner',client.replace('installToolbarClient(chrome)','installToolbarClient(foreignChrome)'))]:
  archive.write_text(text);check(name,replacement,valid,False)
 archive.write_text('const inert=String.raw'+chr(96)+'\n'+client+chr(96)+';');check('template-Archive-hook',replacement,valid,False)
 archive.write_text('const inert='+chr(34)+chr(92)+'\n'+client.replace('\n',chr(92)+'\n')+chr(34)+';');check('quoted-multiline-Archive-hook',replacement,valid,False)
 archive.write_text(client)
 (root/'background/toolbar-entry.js').unlink();check('missing-packaged-owner',replacement,valid,False)
 print(json.dumps(rows))
`],{cwd:fileURLToPath(new URL('..',import.meta.url)),encoding:'utf8'});
 const cases=JSON.parse(output);assert.equal(cases.length,20);assert.deepEqual(cases.filter(row=>row.accepted).map(row=>row.case),['legacy-popup','reviewed-toolbar','quoted-URL-wildcard','quoted-comment-markers']);
});
