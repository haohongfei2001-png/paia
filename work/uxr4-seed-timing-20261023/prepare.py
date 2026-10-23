from pathlib import Path
import json,difflib,hashlib,re
out=Path(__file__).resolve().parent
root=out.parent.parent
original=(out/'original-ux-large.mjs').read_text()
source=original
edits=[]
def change(old,new):
 global source
 assert source.count(old)==1,(old,source.count(old))
 source=source.replace(old,new)
 edits.append({'old':old,'new':new})
prelude="""
 const __now=()=>performance.now();
 const __timing={version:1,startedMs:__now(),finishedMs:null,failed:false,phases:[],batches:[]};
 globalThis.__uxr4SeedTiming=__timing;
 const __begin=name=>{const p={name,startMs:__now(),endMs:null};__timing.phases.push(p);return p;};
 const __end=p=>{p.endMs=__now();};
 try{
"""
change('page.evaluate(async()=>{','page.evaluate(async()=>{'+prelude)
change('   const values=',"   const __template=__begin('template');\n   const values=")
change("   await s.repository.transaction(true,async t=>{for(const name", "   __end(__template);const __clear=__begin('clear');\n   await s.repository.transaction(true,async t=>{for(const name")
change('});const began=performance.now();',"});__end(__clear);const __seed=__begin('seed-including-final-counts');const began=performance.now();")
change('for(let start=0;start<100000;start+=500)await s.repository.transaction(true,async t=>{const writes=[];for(let i=start;i<start+500;i++){',"for(let start=0;start<100000;start+=500){const __batch={kind:'inputs',offset:start,units:500,transactionStartMs:__now(),callbackStartMs:null,requestsIssuedMs:null,promisesDoneMs:null,transactionDoneMs:null,objectConstructionMs:0};__timing.batches.push(__batch);await s.repository.transaction(true,async t=>{__batch.callbackStartMs=__now();const writes=[];for(let i=start;i<start+500;i++){const __construct=__now();")
change("};writes.push(t.put('inputStates'", "};__batch.objectConstructionMs+=__now()-__construct;writes.push(t.put('inputStates'")
change("if(i%100===0){const doc=", "if(i%100===0){const __docConstruct=__now();const doc=")
change("docId];writes.push(t.put('documents'", "docId];__batch.objectConstructionMs+=__now()-__docConstruct;writes.push(t.put('documents'")
change("   }await Promise.all(writes);});await s.repository.transaction(true,t=>t.put('meta',{id:'sequence',records:100000,blocks:100000,documents:1000}));", "   }__batch.requestsIssuedMs=__now();await Promise.all(writes);__batch.promisesDoneMs=__now();});__batch.transactionDoneMs=__now();}const __sequence=__begin('sequence');await s.repository.transaction(true,t=>t.put('meta',{id:'sequence',records:100000,blocks:100000,documents:1000}));__end(__sequence);")
change("   const first=await s.createTopic", "   const __owners=__begin('topic-entry-owner-and-template-reads');const first=await s.createTopic")
change("   for(let start=0;start<5000;start+=500)await s.repository.transaction(true,async t=>{const writes=[];", "   __end(__owners);for(let start=0;start<5000;start+=500){const __batch={kind:'entries',offset:start,units:500,transactionStartMs:__now(),callbackStartMs:null,requestsIssuedMs:null,promisesDoneMs:null,transactionDoneMs:null,objectConstructionMs:null};__timing.batches.push(__batch);await s.repository.transaction(true,async t=>{__batch.callbackStartMs=__now();const writes=[];")
change('}await Promise.all(writes);});clearInterval(timer);', '}__batch.requestsIssuedMs=__now();await Promise.all(writes);__batch.promisesDoneMs=__now();});__batch.transactionDoneMs=__now();}clearInterval(timer);')
change('const counts=await s.repository.transaction(false,', "const __counts=__begin('final-four-counts');const counts=await s.repository.transaction(false,")
change('}));return {counts,seedMs:', '}));__end(__counts);__end(__seed);return {counts,seedMs:')
change('\n});}', '\n }catch(__error){__timing.failed=true;throw __error;}finally{__timing.finishedMs=__now();}\n});}')
(out/'instrumented-ux-large.mjs').write_text(source)
(out/'edits.json').write_text(json.dumps(edits,indent=2)+'\n')
(out/'instrumentation.patch').write_text(''.join(difflib.unified_diff(original.splitlines(True),source.splitlines(True),fromfile='frozen/ux-large.mjs',tofile='isolated/instrumented-ux-large.mjs')))
restored=source
for e in reversed(edits):
 assert restored.count(e['new'])==1
 restored=restored.replace(e['new'],e['old'])
assert restored==original
# Preserve the complete original F-LARGE case and its assertions; only export
# timing in its existing finally, before the original harness close.
test_source=(root/'extension/tests/ux-r4-search-reuse-chrome-e2e.test.mjs').read_text()
prefix=test_source[:test_source.index('// Original Context UI journeys')]
case=test_source[test_source.index("test('UX-R4 F-LARGE"):test_source.index("test('UX-R4 real worker legacy")].rstrip()+'\n'
case_original=case
export="""try{await writeFile(new URL('phases.json',dir),JSON.stringify(await p.evaluate(()=>globalThis.__uxr4SeedTiming??null),null,2)+'\\n');}catch(__exportError){console.error('DIAGNOSTIC_EXPORT_UNAVAILABLE');}await h.close();"""
assert case.count('await h.close();')==1
case=case.replace('await h.close();',export)
prefix=prefix.replace("'./harness/ux-large.mjs'",repr((out/'instrumented-ux-large.mjs').as_uri()))
prefix=re.sub(r"from '(\./[^']+)'",lambda m:'from '+repr((root/'extension/tests'/m[1]).resolve().as_uri()),prefix)
prefix=prefix.replace("const dir=new URL('../work/ux-r4/',import.meta.url);", "const dir=new URL('./artifacts/',import.meta.url);")
# mkdir is evidence-only and occurs before the test starts; no browser launched.
prefix=prefix.replace("const pause=", "await mkdir(dir,{recursive:true});\nconst pause=")
driver=prefix+case
assert 'timeout:300000' in case and case.replace(export,'await h.close();')==case_original
assert driver.count("test('")==1
(out/'diagnostic.test.mjs').write_text(driver)
(out/'original-large-case.txt').write_text(case_original)
assert len(re.findall(r'\bawait\b',source))==len(re.findall(r'\bawait\b',original))
for forbidden in ['.prototype=', '.semanticEnabled=', 'durability:', 'objectStore(', 'Promise.allSettled', 'setTimeout(']:
 assert forbidden not in source
result={'originalSHA256':hashlib.sha256(original.encode()).hexdigest(),'instrumentedSHA256':hashlib.sha256(source.encode()).hexdigest(),'reversibleOriginalBytes':True,'originalAwaitCount':len(re.findall(r'\bawait\b',original)),'instrumentedAwaitCount':len(re.findall(r'\bawait\b',source)),'unchangedCaseAfterRemovingEvidenceExport':True,'caseTimeoutMs':300000,'testCases':1,'originalCountsAndBatchBoundsPreserved':True,'internalHookVsNativeCommit':'UNKNOWN; combined post-callback transaction wait','constructionMetric':'Input record/block/document object construction only; index-factory CPU remains in dispatch bucket. Entry object construction inseparable from dispatch without reordering and left UNKNOWN.'}
(out/'static-validation.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
