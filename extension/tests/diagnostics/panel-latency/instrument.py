#!/usr/bin/env python3
"""Exact a7d measurement-only instrumentation. Never launches a browser."""
import argparse, hashlib, json, os, tempfile
from pathlib import Path

SPECS = {'core/ia-store.js': {'sha256': '87f5699dbcb631b2389e887aa5ae1deb0d1ebfbe31bf1324d1df73518f8d0e05', 'edits': []},
 'core/idb-repository.js': {'sha256': '9d280288a0201be8842bf16a22f981feb6d22ca5336c52a7eee9f3964c4e521a', 'edits': []},
 'core/indexed-store.js': {'sha256': 'd30528aab204a034165cae0c99d4254d60fe59a5aedf9f9742db36f5f2e2884c', 'edits': []},
 'core/manual-materials.js': {'sha256': '6c580ef2514efa9e97139fa819f2735d4058afac9c9981428a152729d355c87b',
                              'edits': [('export async function readPromptReuseMaterial(memory,t,inputId,filter){',
                                         'export async function '
                                         'readPromptReuseMaterial(memory,t,inputId,filter,__panelCountSources){'),
                                        (' if(!p||!p.sourceRecordIds.length||await '
                                         's.isFiltered(t,p.block,filter))return null;',
                                         ' if(!p||!p.sourceRecordIds.length||await '
                                         's.isFiltered(t,p.block,filter))return null;\n'
                                         ' __panelCountSources?.(p.sourceRecordIds.length);')]},
 'core/prompt-reuse-service.js': {'sha256': '610acab4a86931e2b97ddb70717e0caa137a1154bf6a54bac43abd7ac55e5729',
                                  'edits': [('export class PromptReuseService{',
                                             '\n'
                                             '// Diagnostic-only, body-free numeric identities. No authority or '
                                             'product DTO.\n'
                                             'const __panelDiagnostic=globalThis.__panelDiagnostic??=(()=>{\n'
                                             ' const services=new WeakMap(),reads=new WeakMap(),frames=new '
                                             'Map(),nonces=new Map();let sequence=0;\n'
                                             ' const '
                                             'now=()=>performance.timeOrigin+performance.now(),id=()=>++sequence;\n'
                                             ' const '
                                             'service=owner=>{if(!services.has(owner))services.set(owner,id());return '
                                             'services.get(owner);};\n'
                                             ' const capture=()=>{const trace=globalThis.__panelTrace;return '
                                             'Array.isArray(trace)?{trace,epoch:trace.epoch??0}:null;};\n'
                                             ' const begin=(owner,operation,source=null)=>{const '
                                             'c=capture();if(!c)return null;let frameId=0;if(source){const '
                                             'key=JSON.stringify([source.tabId,source.windowId,source.frameId,source.documentId,source.nonce]);if(!frames.has(key))frames.set(key,id());frameId=frames.get(key);nonces.set(source.nonce,frameId);}const '
                                             "event={kind:source?'surfaceCall':'serviceCall',epoch:c.epoch,serviceId:service(owner),callId:id(),operation,frameId,start:now()};c.trace.push(event);return "
                                             '{...c,event};};\n'
                                             ' const end=c=>{if(c)c.event.end=now();};\n'
                                             ' const read=(owner,c,object=null)=>{const '
                                             'r={trace:c?.trace??null,epoch:c?.epoch??0,serviceId:service(owner),leaderCallId:c?.event.callId??0,readId:id()};if(object)reads.set(object,r);return '
                                             'r;};\n'
                                             ' const pending=(kind,object,c=null)=>{const '
                                             'r=reads.get(object);if(!r)return;const '
                                             'trace=c?.trace??r.trace;if(!trace)return;trace.push({kind,epoch:c?.epoch??r.epoch,leaderEpoch:r.epoch,serviceId:r.serviceId,readId:r.readId,leaderCallId:r.leaderCallId,joinerCallId:c?.event.callId??0,at:now()});};\n'
                                             ' return '
                                             '{begin,end,read,pending,readInfo:object=>reads.get(object),frameId:nonce=>nonces.get(nonce)??0};\n'
                                             '})();\n'
                                             'export class PromptReuseService{'),
                                            (' async snapshot(){return this.#snapshot(true);}',
                                             ' async snapshot(__panelCall=null){return '
                                             'this.#snapshot(true,__panelCall);}'),
                                            (' async #snapshot(projectCorrections){',
                                             ' async #snapshot(projectCorrections,__panelCall=null){\n'
                                             '  const '
                                             '__panelStart=performance.timeOrigin+performance.now(),__panelTrace=__panelCall?.trace??globalThis.__panelTrace,__panelRead=__panelDiagnostic.read(this,__panelCall);let '
                                             '__panelPages=0,__panelRows=0,__panelSources=0;const '
                                             '__panelCountSources=n=>{__panelSources+=n;};'),
                                            ('  let after,base,preferences;const inputs=[];',
                                             '  const __panelFoundation=performance.timeOrigin+performance.now();\n'
                                             '  let after,base,preferences;const inputs=[];'),
                                            ("const batch=await t.page('inputStates',{after,limit:100}),items=[];",
                                             'const batch=await '
                                             "t.page('inputStates',{after,limit:100}),items=[];__panelPages++;__panelRows+=batch.rows.length;"),
                                            ('readPromptReuseMaterial(memory,t,m.id,filter);',
                                             'readPromptReuseMaterial(memory,t,m.id,filter,__panelCountSources);'),
                                            ('  const families=await '
                                             'projectPromptFamilies(inputs,preferences,this.clock());',
                                             '  const __panelScanEnd=performance.timeOrigin+performance.now();\n'
                                             '  const families=await '
                                             'projectPromptFamilies(inputs,preferences,this.clock());\n'
                                             '  const __panelFamiliesEnd=performance.timeOrigin+performance.now();'),
                                            ('  const '
                                             'snapshot={families,preferences,generation:base,inputs};if(projectCorrections&&this.syncJournal?.correctionBindings)return '
                                             '{...snapshot,...await '
                                             'this.syncJournal.projectCorrections(snapshot,this.clock())};return '
                                             'snapshot;',
                                             '  const snapshot={families,preferences,generation:base,inputs};let '
                                             '__panelResult=snapshot;if(projectCorrections&&this.syncJournal?.correctionBindings)__panelResult={...snapshot,...await '
                                             'this.syncJournal.projectCorrections(snapshot,this.clock())};\n'
                                             '  '
                                             '__panelTrace?.push({kind:"snapshot",epoch:__panelRead.epoch,serviceId:__panelRead.serviceId,callId:__panelRead.leaderCallId,readId:__panelRead.readId,start:__panelStart,foundation:__panelFoundation,scanEnd:__panelScanEnd,familiesEnd:__panelFamiliesEnd,end:performance.timeOrigin+performance.now(),pages:__panelPages,rows:__panelRows,sourceRefs:__panelSources,eligible:inputs.length,families:families.length});return '
                                             '__panelResult;'),
                                            (' async query({includeHidden=false}={}){',
                                             ' async query({includeHidden=false}={}){\n'
                                             '  const __panelCall=__panelDiagnostic.begin(this,"query");'),
                                            ('const serial=this.#nextFamilyView.begin(),x=await this.snapshot();',
                                             'const serial=this.#nextFamilyView.begin(),x=await '
                                             'this.snapshot(__panelCall);'),
                                            ('  return '
                                             '{revision:x.preferences.revision,generation:x.generation,manualOrder:[...x.preferences.pins],',
                                             '  __panelDiagnostic.end(__panelCall);return '
                                             '{revision:x.preferences.revision,generation:x.generation,manualOrder:[...x.preferences.pins],'),
                                            (' async resolve({id,text}={}){',
                                             ' async resolve({id,text}={}){\n'
                                             '  const __panelCall=__panelDiagnostic.begin(this,"resolve");'),
                                            ("if(typeof id!=='string'||!validPromptText(text))fail();const x=await "
                                             'this.snapshot();',
                                             "if(typeof id!=='string'||!validPromptText(text))fail();const x=await "
                                             'this.snapshot(__panelCall);'),
                                            ('if(!f||f.text!==text)changed();return '
                                             '{id:f.id,text:f.text,generation:x.generation};',
                                             'if(!f||f.text!==text)changed();__panelDiagnostic.end(__panelCall);return '
                                             '{id:f.id,text:f.text,generation:x.generation};')]},
 'core/smart-filter-store.js': {'sha256': '224880a922de184b35dc23b222433de73b73265580a796ecd6e41791590edb92',
                                'edits': []},
 'core/thought-store.js': {'sha256': 'd073825c0d9e20d770887c6457c4638b6d9f4a63cef8e84c5b7b166a12de6172', 'edits': []},
 'background/prompt-surface.js': {'sha256': 'ed43a96f6d740aea7921486ea2979673156dec8c4e2804984babbb77473c7117',
                                  'edits': [(' async currentReadTarget(source){',
                                             ' async currentReadTarget(source){\n'
                                             '  const '
                                             '__panelStart=performance.timeOrigin+performance.now(),__panelTrace=globalThis.__panelTrace;'),
                                            ('  await this.consent();\n }\n async currentSelectionTarget',
                                             '  await this.consent();\n'
                                             '  '
                                             '__panelTrace?.push({kind:"readTarget",start:__panelStart,end:performance.timeOrigin+performance.now()});\n'
                                             ' }\n'
                                             ' async currentSelectionTarget'),
                                            ('    let value;try{value=await this.assist?.card',
                                             '    const '
                                             '__panelCall=globalThis.__panelDiagnostic.begin(this.commands.service,"suggestion_current",source);\n'
                                             '    let value;try{value=await this.assist?.card'),
                                            ('await '
                                             "context.assertCurrent();if(value?.result?.kind==='SUGGESTION')return "
                                             "{source:'assist',result:value.result};",
                                             'await '
                                             "context.assertCurrent();if(value?.result?.kind==='SUGGESTION'){globalThis.__panelDiagnostic.end(__panelCall);return "
                                             "{source:'assist',result:value.result};}"),
                                            ('await context.assertCurrent();return '
                                             "{source:'local',result:local?.result??null};",
                                             'await '
                                             'context.assertCurrent();globalThis.__panelDiagnostic.end(__panelCall);return '
                                             "{source:'local',result:local?.result??null};"),
                                            ('  if(reading)await this.currentReadTarget(readSource);',
                                             '  const '
                                             '__panelCall=c.type===\'PAIA_PROMPT_QUERY\'?globalThis.__panelDiagnostic.begin(this.commands.service,"PAIA_PROMPT_QUERY",readSource):null;\n'
                                             '  if(reading)await this.currentReadTarget(readSource);'),
                                            ('  return '
                                             "{...result,target:{url:tab.url,documentId:sender.documentId,nonce:r.nonce},theme:host.dark?'dark':'light'",
                                             '  globalThis.__panelDiagnostic.end(__panelCall);return '
                                             "{...result,target:{url:tab.url,documentId:sender.documentId,nonce:r.nonce},theme:host.dark?'dark':'light'")]}}

def sha(data): return hashlib.sha256(data).hexdigest()

def prepare(root):
 prepared=[]
 for relative,spec in SPECS.items():
  path=root/relative
  if path.is_symlink(): raise ValueError(f'Refusing symlink: {relative}')
  raw=path.read_bytes()
  if sha(raw)!=spec['sha256']: raise ValueError(f'Baseline SHA256 mismatch: {relative}; no files changed')
  text=raw.decode('utf-8')
  for i,(old,new) in enumerate(spec['edits']):
   if text.count(old)!=1: raise ValueError(f'Anchor {i} count mismatch: {relative}; no files changed')
   if new in text: raise ValueError(f'Already instrumented anchor {i}: {relative}; no files changed')
   text=text.replace(old,new,1)
  if spec['edits']:prepared.append((path,raw,text.encode('utf-8')))
 return prepared

def apply(root,check=False):
 # Validate every original hash and anchor before writing or staging any file.
 prepared=prepare(root)
 receipt={'mode':'check' if check else 'instrument','files':[{ 'path':str(p.relative_to(root)), 'baselineSha256':sha(before),'instrumentedSha256':sha(after)}for p,before,after in prepared]}
 if check:return receipt
 staged=[];replaced=[]
 try:
  for path,before,after in prepared:
   fd,name=tempfile.mkstemp(prefix='.panel-latency-',dir=path.parent)
   with os.fdopen(fd,'wb')as f:f.write(after);f.flush();os.fsync(f.fileno())
   os.chmod(name,path.stat().st_mode)
   staged.append((path,Path(name),before))
  # Recheck every pinned file and all anchors after staging, before replacement.
  prepare(root)
  for path,_,before in staged:
   if path.read_bytes()!=before:raise ValueError(f'Concurrent baseline change: {path.name}; no files changed')
  for path,temp,before in staged:os.replace(temp,path);replaced.append((path,before))
 except Exception:
  # Best-effort rollback for filesystem failure. A rollback failure is explicit.
  errors=[]
  for path,before in reversed(replaced):
   try:path.write_bytes(before)
   except Exception as e:errors.append(f'{path}: {type(e).__name__}')
  if errors:raise RuntimeError('Instrumentation rollback failed: '+', '.join(errors))
  raise
 finally:
  for _,temp,_ in staged:
   if temp.exists():temp.unlink()
 return receipt

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--extension',required=True,type=Path);parser.add_argument('--check',action='store_true');args=parser.parse_args()
 print(json.dumps(apply(args.extension.resolve(),args.check),indent=2))
