#!/usr/bin/env python3
"""Make a separate explicit development build; never copy profiles or exports."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json, shutil, sys, os, subprocess
root=Path(__file__).resolve().parents[1]
if len(sys.argv)==1:
    node=os.environ.get('PAIA_NODE') or shutil.which('node')
    if not node or subprocess.run([node,str(root/'scripts/compatibility-gate.mjs'),'--sampler']).returncode:
        raise SystemExit('Sampler requires current full automatic tests and audit')
target=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else root/'work/paia-compat-development'
target.mkdir(parents=True,exist_ok=True)
if any(target.iterdir()):
    raise RuntimeError("Development destination must be empty")
for folder in ('adapter','content','background','core','ui','icons'):
    for p in (root/folder).rglob('*'):
        if p.is_file() and p.suffix in ('.js','.html','.css','.png','.svg'):
            out=target/p.relative_to(root);out.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,out)
for p in (root/'development/compat').glob('*'):
    if p.suffix in ('.js','.md'):
        out=target/p.relative_to(root);out.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,out)
shutil.copyfile(root/'development/compat/sanitizer.js',target/'development/compat/sanitizer-main.js')
p=target/'content/response-observer.js';s=p.read_text()
control="    if (data?.channel !== 'archive-response-control-v1') return;"
observe='    try { void result.then(response => {'
assert s.count(control)==1 and s.count(observe)==1
p.write_text(s.replace(control,control+'\n    globalThis.PAIADevelopment.control(data);').replace(observe,observe+'\n      globalThis.PAIADevelopment.observe(response);'))
m=json.loads((root/'manifest.json').read_text());m['version_name']='0.3.0 development structure sampler'
for entry in m['content_scripts']:
    if entry['world']=='MAIN':entry['js']=['development/compat/sanitizer-main.js','development/compat/main.js']+entry['js']
    elif 'content/response-bridge.js' in entry['js']:entry['js'].insert(0,'development/compat/sanitizer.js')
m['content_scripts'].append({'matches':['https://chatgpt.com/*'],'js':['development/compat/content.js'],'run_at':'document_idle','world':'ISOLATED','all_frames':False})
(target/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
p=target/'background/service-worker.js';s=p.read_text();needle="  if (request.type === 'GET_STATUS') return store.status();"
branch='''
  if (content && request.type === 'DEV_COMPAT_CHECK') {
    const source=canonicalChat(sender.tab.url ?? sender.url);
    if(!source||source.id!==request.chat||!Array.isArray(request.ids)||request.ids.length>2000||!request.ids.every(id=>typeof id==='string'&&/^[A-Za-z0-9_-]{8,128}$/.test(id)))throw new ArchiveError('FORBIDDEN');
    const state=await store.snapshot();
    return {recovered:request.ids.length>0&&request.ids.every(id=>state.records.some(r=>r.chatId===source.id&&r.sourceMessageId===id&&r.sourceSentAt!==null&&['high','very_high'].includes(r.timeConfidence)))};
  }
'''
assert needle in s;p.write_text(s.replace(needle,needle+branch))
if len(sys.argv)==1:
    archive=root/'outputs/PAIA-Development-Structure-Sampler.zip'
    with ZipFile(archive,'w',ZIP_DEFLATED) as z:
        for p in sorted(target.rglob('*')):
            if p.is_file():z.write(p,Path('PAIA-Development-Structure-Sampler')/p.relative_to(target))
    print('DEVELOPMENT_PACKAGE_READY')
