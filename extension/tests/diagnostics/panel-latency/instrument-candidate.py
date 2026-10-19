#!/usr/bin/env python3
"""Exact seven-file candidate only. Never launches a browser."""
import argparse, hashlib, importlib.util, json
from pathlib import Path
HERE=Path(__file__).resolve().parent
BASELINE_INSTRUMENT_SHA='c665e09cdf1517ad90d6f42753a5c57fbeeefc946d9c807c2cec2eb15574c3c9'
path=HERE/'instrument.py'
if path.is_symlink() or hashlib.sha256(path.read_bytes()).hexdigest()!=BASELINE_INSTRUMENT_SHA:raise ValueError('Original baseline instrumentation changed')
spec=importlib.util.spec_from_file_location('baseline_instrument',path)
engine=importlib.util.module_from_spec(spec);spec.loader.exec_module(engine)
SPECS = {'core/ia-store.js': {'sha256': 'f6ab17908cb65f6e2c8221277e9a7efe0a67ce0cd714d21d8713f8498dcee283', 'edits': []},
 'core/idb-repository.js': {'sha256': 'f963e59c37b21be0edff2d7f897deda409a2a9fa0ac73ca74d2defa531916f9f', 'edits': []},
 'core/indexed-store.js': {'sha256': 'c300f106e25f00d8a209bd5954a8aa3de48148ff59617ca94bc6fca624803490', 'edits': []},
 'core/manual-materials.js': {'sha256': '10fd069e360f73a82f0db277843d59f6f17a6bb7ed0a9f29b088fc0b8ca01af4',
                              'edits': [('export function readPromptReuseMaterial(memory,t,inputId,filter){return '
                                         'promptReuseMaterial(memory,t,inputId,filter);}',
                                         'export function '
                                         'readPromptReuseMaterial(memory,t,inputId,filter,__panelCountSources){return '
                                         'promptReuseMaterial(memory,t,inputId,filter,null,__panelCountSources);}'),
                                        ('export async function observedPromptReuseMaterial(memory,t,inputId,filter){',
                                         'export async function '
                                         'observedPromptReuseMaterial(memory,t,inputId,filter,__panelCountSources){'),
                                        ('filterToken=read.token;return read.filtered;\n });',
                                         'filterToken=read.token;return read.filtered;\n },__panelCountSources);'),
                                        ('async function promptReuseMaterial(memory,t,inputId,filter,filterRead=null){',
                                         'async function '
                                         'promptReuseMaterial(memory,t,inputId,filter,filterRead=null,__panelCountSources){'),
                                        (' if(!p||!p.sourceRecordIds.length||await '
                                         '(filterRead?filterRead(p.block):s.isFiltered(t,p.block,filter)))return null;',
                                         ' if(!p||!p.sourceRecordIds.length||await '
                                         '(filterRead?filterRead(p.block):s.isFiltered(t,p.block,filter)))return '
                                         'null;\n'
                                         ' __panelCountSources?.(p.sourceRecordIds.length);')]},
 'core/prompt-reuse-service.js': {'sha256': 'bc48bdf70895db38fb1252378e7d522a47aad4c925916dd0bfe41df8c798649f',
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
                                             'this.#snapshot(true,null,__panelCall);}'),
                                            (' async #snapshot(projectCorrections,observation=null){',
                                             ' async #snapshot(projectCorrections,observation=null,__panelCall=null){\n'
                                             '  const '
                                             '__panelStart=performance.timeOrigin+performance.now(),__panelTrace=__panelCall?.trace??globalThis.__panelTrace,__panelRead=__panelDiagnostic.readInfo(observation)??__panelDiagnostic.read(this,__panelCall);let '
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
                                            ('observedPromptReuseMaterial(memory,t,m.id,filter);',
                                             'observedPromptReuseMaterial(memory,t,m.id,filter,__panelCountSources);'),
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
                                            ('const serial=this.#nextFamilyView.begin(),x=await this.#querySnapshot();',
                                             'const serial=this.#nextFamilyView.begin(),x=await '
                                             'this.#querySnapshot(__panelCall);'),
                                            ('  return '
                                             '{revision:x.preferences.revision,generation:x.generation,manualOrder:[...x.preferences.pins],',
                                             '  __panelDiagnostic.end(__panelCall);return '
                                             '{revision:x.preferences.revision,generation:x.generation,manualOrder:[...x.preferences.pins],'),
                                            (' async resolve({id,text}={}){',
                                             ' async resolve({id,text}={}){\n'
                                             '  const __panelCall=__panelDiagnostic.begin(this,"resolve");'),
                                            ("if(typeof id!=='string'||!validPromptText(text))fail();const x=await "
                                             'this.#querySnapshot();',
                                             "if(typeof id!=='string'||!validPromptText(text))fail();const x=await "
                                             'this.#querySnapshot(__panelCall);'),
                                            ('if(!f||f.text!==text)changed();return '
                                             '{id:f.id,text:f.text,generation:x.generation};',
                                             'if(!f||f.text!==text)changed();__panelDiagnostic.end(__panelCall);return '
                                             '{id:f.id,text:f.text,generation:x.generation};'),
                                            ('const '
                                             'declineRead=read=>{if(read.unshareable)return;read.unshareable=true;read.decline();};',
                                             'const '
                                             'declineRead=read=>{if(read.unshareable)return;read.unshareable=true;__panelDiagnostic.pending("pendingDecline",read);read.decline();};'),
                                            (' async #querySnapshot(){\n'
                                             '  if(!this.#originalReadOwner())return this.snapshot();\n'
                                             '  // A disproved scan remains in its original slot until actual '
                                             'settlement.\n'
                                             '  // New callers simply perform their own original work, without '
                                             'observers.\n'
                                             '  if(this.#pendingRead?.active&&this.#pendingRead.unshareable)return '
                                             'this.snapshot();\n'
                                             '  await this.s.finishFoundation();const binding=await '
                                             'this.#readBinding();\n'
                                             '  if(!binding)return this.snapshot();\n'
                                             '  const pending=this.#pendingRead;\n'
                                             '  if(pending?.active){\n'
                                             '   '
                                             'if(pending.unshareable||!this.#sameReadBinding(binding,pending.binding,pending))return '
                                             'this.snapshot();\n'
                                             '   pending.joined=true;\n'
                                             '   // A private decline conveys no material and grants no scope. It '
                                             'only\n'
                                             '   // stops waiting for work that already cannot be reused. Both '
                                             'complete\n'
                                             '   // original-currentness guards around the independent scan remain.\n'
                                             '   try{await Promise.race([pending.promise,pending.declined]);}catch{\n'
                                             '    await this.#readStillCurrent(binding,pending.binding,pending);\n'
                                             '    const fresh=await this.snapshot();await '
                                             'this.#readStillCurrent(binding,pending.binding,pending);return fresh;\n'
                                             '   }\n'
                                             '   await this.#readStillCurrent(binding,pending.binding,pending);\n'
                                             '   if(!pending.static){const fresh=await this.snapshot();await '
                                             'this.#readStillCurrent(binding,pending.binding,pending);return fresh;}\n'
                                             '   // Only already-waiting callers can use this settled result. '
                                             'Reproject with\n'
                                             "   // this caller's original clock and own independent objects, then "
                                             'requalify.\n'
                                             '   const '
                                             'material=pending.material,copy={inputs:structuredClone(material.inputs),preferences:structuredClone(material.preferences),generation:material.generation};\n'
                                             '   copy.families=await '
                                             'projectPromptFamilies(copy.inputs,copy.preferences,this.clock());\n'
                                             '   await this.#readStillCurrent(binding,pending.binding,pending);return '
                                             'copy;\n'
                                             '  }\n'
                                             '  const '
                                             'read={binding,active:true,joined:false,ownerChanged:false,unshareable:false,static:false,expected:0,receipts:[],promise:null,declined:null,decline:null};\n'
                                             '  read.declined=new Promise(resolve=>{read.decline=resolve;});\n'
                                             '  this.#pendingRead=read;read.promise=this.#snapshot(true,read);\n'
                                             '  const '
                                             'retire=()=>{read.active=false;read.receipts=[];if(this.#pendingRead===read)this.#pendingRead=null;};\n'
                                             '  // Retire at the underlying original settlement, before caller final '
                                             'checks.\n'
                                             "  // Never await this work while occupying the Store's serialization "
                                             'queue.\n'
                                             '  read.promise.then(retire,retire);\n'
                                             '  const result=await read.promise;\n'
                                             '  if(read.joined&&read.static)await '
                                             'this.#readStillCurrent(binding,binding,read);\n'
                                             '  return result;\n'
                                             ' }',
                                             ' async #querySnapshot(__panelCall=null){\n'
                                             '  if(!this.#originalReadOwner())return this.snapshot(__panelCall);\n'
                                             '  // A disproved scan remains in its original slot until actual '
                                             'settlement.\n'
                                             '  // New callers simply perform their own original work, without '
                                             'observers.\n'
                                             '  if(this.#pendingRead?.active&&this.#pendingRead.unshareable)return '
                                             'this.snapshot(__panelCall);\n'
                                             '  await this.s.finishFoundation();const binding=await '
                                             'this.#readBinding();\n'
                                             '  if(!binding)return this.snapshot(__panelCall);\n'
                                             '  const pending=this.#pendingRead;\n'
                                             '  if(pending?.active){\n'
                                             '   '
                                             'if(pending.unshareable||!this.#sameReadBinding(binding,pending.binding,pending))return '
                                             'this.snapshot(__panelCall);\n'
                                             '   '
                                             'pending.joined=true;__panelDiagnostic.pending("pendingJoin",pending,__panelCall);\n'
                                             '   // A private decline conveys no material and grants no scope. It '
                                             'only\n'
                                             '   // stops waiting for work that already cannot be reused. Both '
                                             'complete\n'
                                             '   // original-currentness guards around the independent scan remain.\n'
                                             '   try{await Promise.race([pending.promise,pending.declined]);}catch{\n'
                                             '    await this.#readStillCurrent(binding,pending.binding,pending);\n'
                                             '    const fresh=await this.snapshot(__panelCall);await '
                                             'this.#readStillCurrent(binding,pending.binding,pending);return fresh;\n'
                                             '   }\n'
                                             '   await this.#readStillCurrent(binding,pending.binding,pending);\n'
                                             '   if(!pending.static){const fresh=await '
                                             'this.snapshot(__panelCall);await '
                                             'this.#readStillCurrent(binding,pending.binding,pending);return fresh;}\n'
                                             '   // Only already-waiting callers can use this settled result. '
                                             'Reproject with\n'
                                             "   // this caller's original clock and own independent objects, then "
                                             'requalify.\n'
                                             '   const '
                                             'material=pending.material,copy={inputs:structuredClone(material.inputs),preferences:structuredClone(material.preferences),generation:material.generation};\n'
                                             '   copy.families=await '
                                             'projectPromptFamilies(copy.inputs,copy.preferences,this.clock());\n'
                                             '   await '
                                             'this.#readStillCurrent(binding,pending.binding,pending);__panelDiagnostic.pending("pendingReused",pending,__panelCall);return '
                                             'copy;\n'
                                             '  }\n'
                                             '  const '
                                             'read={binding,active:true,joined:false,ownerChanged:false,unshareable:false,static:false,expected:0,receipts:[],promise:null,declined:null,decline:null};\n'
                                             '  read.declined=new Promise(resolve=>{read.decline=resolve;});\n'
                                             '  __panelDiagnostic.read(this,__panelCall,read);\n'
                                             '  '
                                             'this.#pendingRead=read;read.promise=this.#snapshot(true,read,__panelCall);\n'
                                             '  const '
                                             'retire=()=>{read.active=false;read.receipts=[];if(this.#pendingRead===read)this.#pendingRead=null;};\n'
                                             '  // Retire at the underlying original settlement, before caller final '
                                             'checks.\n'
                                             "  // Never await this work while occupying the Store's serialization "
                                             'queue.\n'
                                             '  read.promise.then(retire,retire);\n'
                                             '  const result=await read.promise;\n'
                                             '  if(read.joined&&read.static)await '
                                             'this.#readStillCurrent(binding,binding,read);\n'
                                             '  return result;\n'
                                             ' }')]},
 'core/smart-filter-store.js': {'sha256': '89b98d84799a4deb4b15974e6487c395d42371baa4eaef2a1721754e78e4e7b0',
                                'edits': []},
 'core/thought-store.js': {'sha256': '3e17140c3b5a425ead5dddaf9e22ec652ec89d200300c4e1f134d4e6a6e17e3c', 'edits': []},
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
engine.SPECS=SPECS
prepare=engine.prepare
apply=engine.apply
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--extension',type=Path,required=True);parser.add_argument('--check',action='store_true');args=parser.parse_args()
 print(json.dumps(apply(args.extension.resolve(),args.check),indent=2))
