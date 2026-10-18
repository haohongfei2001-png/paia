import {fixture,protocol} from './service-fixtures.mjs';
import {request} from './postgres-fixtures.mjs';
import {createPostgresResultService} from '../result-service.mjs';

// Deterministic SQL protocol simulator only. Real PostgreSQL has a separate file.
export async function resultFixture({count=1,states,hook}={}){
 const f=fixture(),p=protocol(f,{hook}),requests=[],bundles=[],service=p.service();
 for(let i=0;i<count;i++){
  const r=request('SYNTHETIC-result-'+i,{jobId:'SYNTHETIC-job',childIndex:i,childCount:count,inputTokens:100,outputCap:600,maxCompletionTokens:590}),bundle=p.admit(r);
  requests.push(r);bundles.push(bundle);const reserved=await service.reserve(bundle);if(reserved.decision!=='reserved')throw Error('synthetic setup reserve failed '+JSON.stringify(reserved));
  const state=states?.[i]??'VALIDATED';
  if(state==='CANCELLED'){await service.cancel(bundle);continue;}
  if(state==='RESERVED')continue;
  p.event(r,'SYNTHETIC-dispatch-'+i,'DISPATCHED');await service.record(bundle,'SYNTHETIC-dispatch-'+i);
  if(state==='DISPATCHED')continue;
  if(state==='UNKNOWN'){p.event(r,'SYNTHETIC-unknown-'+i,'OUTCOME_UNKNOWN');await service.record(bundle,'SYNTHETIC-unknown-'+i);continue;}
  p.event(r,'SYNTHETIC-usage-'+i,'SETTLEMENT');const evidence=p.events.get('SYNTHETIC-usage-'+i).evidence;
  Object.assign(evidence,{outcome:state,usage:{inputTokens:100,completionTokens:20,totalTokens:120,reasoningTokens:0,cachedReadTokens:0,cacheCreateTokens:0},nativeMicros:120,usdMicros:120,committedChildren:[]});
  const settled=await service.settle(bundle,evidence.receiptId);if(settled.state!=='SETTLED')throw Error('synthetic setup settle failed '+JSON.stringify(settled));
 }
 const result={receiptId:'SYNTHETIC-local-domain-result',jobId:requests[0].jobId,outcome:'COMMITTED',children:p.saved().rows.map(row=>({operationId:row.request.operationId,receiptId:row.settlement?.receiptId??null}))};
 const create=()=>createPostgresResultService({pool:p.pool,identityConfig:f.identityConfig,profileId:f.profileId});
 return {f,p,requests,bundles,result,service:create(),create};
}
export const http=(f,patch={})=>new Request('https://service.invalid/api/results',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'finalize',...f.bundles[0],result:f.result}),...patch});
