from pathlib import Path
import json,hashlib,statistics
out=Path(__file__).resolve().parent
p=json.loads((out/'artifacts/phases.json').read_text())
r=json.loads((out/'run-result.json').read_text())
summary={'run':r,'failed':p['failed'],'phaseDurationsMs':{x['name']:None if x['endMs'] is None else x['endMs']-x['startMs'] for x in p['phases']},'batchGroups':{}}
for kind in ['inputs','entries']:
 b=[x for x in p['batches'] if x['kind']==kind];done=[x for x in b if x['transactionDoneMs'] is not None]
 metrics={}
 for name,a,z in [('transactionTotalMs','transactionStartMs','transactionDoneMs'),('callbackEntryWaitMs','transactionStartMs','callbackStartMs'),('dispatchIncludingConstructionMs','callbackStartMs','requestsIssuedMs'),('promiseWaitMs','requestsIssuedMs','promisesDoneMs'),('postPromiseRepositoryCompletionMs','promisesDoneMs','transactionDoneMs')]:
  v=[x[z]-x[a] for x in done]
  metrics[name]={'sum':sum(v),'min':min(v) if v else None,'max':max(v) if v else None,'median':statistics.median(v) if v else None}
 v=[x['objectConstructionMs'] for x in done if x['objectConstructionMs'] is not None]
 metrics['partialObjectConstructionMs']={'sum':sum(v) if v else None,'note':'Subset of dispatch; not additive. Input record/block/document objects only. Index factories remain in dispatch. Entry construction UNKNOWN.'}
 summary['batchGroups'][kind]={'started':len(b),'completed':len(done),'completedUnits':sum(x['units'] for x in done),'metrics':metrics}
summary['limitations']=['One macOS arm64 Source run, not Linux or cloud capacity certification.','Observation overhead unmeasured; no second run.','Post-Promise time combines original hooks, metadata flush, generation/fences, strict native completion and continuation; individual components UNKNOWN.','No native IDB event instrumentation or root cause attribution.','Original tests and production sources unchanged.']
(out/'timing-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2))
