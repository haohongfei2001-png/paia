"""R&D only: package-local static embeddings, never imported by the extension.
Run after explicitly downloading pinned public model assets; execution is offline.
"""
import os,json,time,resource,socket,hashlib
from pathlib import Path
os.environ['HF_HUB_OFFLINE']='1'
os.environ['TOKENIZERS_PARALLELISM']='false'
network_attempts=[]
def blocked(*args,**kwargs):
    network_attempts.append('blocked');raise RuntimeError('NETWORK_FORBIDDEN')
socket.socket.connect=blocked
socket.create_connection=blocked
import numpy as np
import onnxruntime as ort
from tokenizers import Tokenizer
class StaticModel:
    @classmethod
    def from_pretrained(cls,path):
        self=cls();options=ort.SessionOptions();options.intra_op_num_threads=1;options.inter_op_num_threads=1
        self.session=ort.InferenceSession(str(Path(path)/'onnx/model_quantized.onnx'),sess_options=options,providers=['CPUExecutionProvider'])
        self.tokenizer=Tokenizer.from_file(str(Path(path)/'tokenizer.json'))
        self.tokenizer.enable_truncation(max_length=512)
        self.tokenizer.enable_padding(pad_id=0,pad_token='[PAD]')
        return self
    def encode(self,texts,**kwargs):
        result=[]
        for start in range(0,len(texts),32):
            batch=self.tokenizer.encode_batch(texts[start:start+32])
            values={'input_ids':np.array([x.ids for x in batch],dtype=np.int64),'attention_mask':np.array([x.attention_mask for x in batch],dtype=np.int64),'token_type_ids':np.array([x.type_ids for x in batch],dtype=np.int64)}
            values={x.name:values[x.name] for x in self.session.get_inputs()}
            hidden=self.session.run(None,values)[0];pooled=hidden[:,0,:]
            pooled=pooled/np.maximum(np.linalg.norm(pooled,axis=1,keepdims=True),1e-12)
            result.append(pooled)
        return np.concatenate(result,axis=0)

root=Path.cwd();data=json.loads((root/'work/intelligence-v0110/dataset.json').read_text())
lexical=json.loads((root/'work/intelligence-v0110/lexical-rankings.json').read_text())
t=time.perf_counter();model=StaticModel.from_pretrained('/private/tmp/paia-v0110-bge');load_ms=(time.perf_counter()-t)*1000
entries=[e for e in data['entries'] if e['eligible']]
texts=[' '.join([e['topicName'],e['sectionTitle'],e['title'],e['body']]) for e in entries]
t=time.perf_counter();vectors=model.encode(texts,use_multiprocessing=False);build_ms=(time.perf_counter()-t)*1000
queries=data['queries'];t=time.perf_counter();qv=model.encode(['为这个句子生成表示以用于检索相关文章：'+q['query'] for q in queries],use_multiprocessing=False);encode_ms=(time.perf_counter()-t)*1000
rows={'vector':[],'hybrid':[]};ids=[e['id'] for e in entries]
for q,v in zip(queries,qv):
    t=time.perf_counter();scores=vectors@v;order=np.argsort(-scores,kind='stable')[:100]
    vector_ids=[ids[i] for i in order if scores[i]>0];query_ms=(time.perf_counter()-t)*1000
    lex=lexical[q['id']];fused={}
    for ranking in [[e['id'] for e in lex],vector_ids]:
        for i,id in enumerate(ranking):fused[id]=fused.get(id,0)+1/(60+i+1)
    exact=[e['id'] for e in lex if e['exact']]
    hybrid=exact+[id for id in sorted(fused,key=lambda id:(-fused[id],id)) if id not in exact]
    for name,ranked in [('vector',vector_ids),('hybrid',hybrid)]:
        relevant=set(q['relevant']);rank=next((i+1 for i,id in enumerate(ranked) if id in relevant),0)
        hit=lambda k:len(set(ranked[:k])&relevant)
        rows[name].append(dict(id=q['id'],taxonomy=q['taxonomy'],split=q['split'],top1=int(rank==1),top3=int(0<rank<=3),top5=int(0<rank<=5),precision3=hit(3)/3,precision5=hit(5)/5,recall10=hit(10)/len(relevant) if relevant else 0,hit10=int(0<rank<=10),mrr=1/rank if rank else 0,returned=len(ranked),queryMs=query_ms,leak=any(id not in ids for id in ranked)))
class Index:
    def __init__(self):self.rows={}
    def remove(self,id):
        v=self.rows.pop(id,None)
        if v is not None:v.fill(0)
    def put(self,id,v):
        self.remove(id)
        if v.shape!=(vectors.shape[1],) or not np.isfinite(v).all():raise ValueError('CORRUPT_VECTOR')
        self.rows[id]=v.copy()
    def clear(self):
        for id in list(self.rows):self.remove(id)
index=Index();index.put('delete',vectors[0]);old=index.rows['delete'];index.remove('delete');assert not old.any()
index.put('edit',vectors[0]);old=index.rows['edit'];index.put('edit',vectors[1]);assert not old.any()
index.put('purge',vectors[2]);old=index.rows['purge'];index.clear();assert not old.any() and not index.rows
try:index.put('bad',np.array([float('nan')]))
except ValueError:pass
else:raise AssertionError('corrupt accepted')
scale=[]
for n in [1000,10000,50000]:
    sample=[texts[i%len(texts)] for i in range(n)]
    t=time.perf_counter();vs=model.encode(sample,use_multiprocessing=False);elapsed=(time.perf_counter()-t)*1000
    t=time.perf_counter();changed=model.encode([sample[0]+' 修改条件'],use_multiprocessing=False);vs[0]=changed[0];update=(time.perf_counter()-t)*1000
    lat=[]
    for query in qv[:30]:
        t=time.perf_counter();np.argsort(-(vs@query))[:10];lat.append((time.perf_counter()-t)*1000)
    scale.append(dict(entries=n,indexBuildMs=elapsed,incrementalOneMs=update,p50Ms=float(np.median(lat)),p95Ms=float(np.quantile(lat,.95)),vectorBytes=vs.nbytes,peakProcessRssBytes=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss))
    vs.fill(0);del vs
metrics=lambda rs:{k:sum(r[k] for r in rs)/len(rs) for k in ['top1','top3','top5','precision3','precision5','recall10','hit10','mrr']}
report=dict(syntheticOnly=True,model='Xenova/bge-small-zh-v1.5',language='Chinese model; mixed/cross-language measured on frozen corpus',execution='ONNX Runtime 1.23.2 CPU, CLS pooling, normalized, recommended query prefix; NOT Chrome/WASM validated',modelLoadMs=load_ms,indexBuildMs=build_ms,queryBatchEncodeMs=encode_ms,vectorDimensions=vectors.shape[1],vectorBytes=vectors.nbytes,peakProcessRssBytes=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,networkAttempts=network_attempts,providerRequests=0,lifecycle=dict(deleteZeroed=True,updateZeroed=True,purgeZeroed=True,corruptionRejected=True,backupIncludesVectors=False,restoreEmptyDerivedIndex=True),scale=scale,results={name:dict(metrics={'all':metrics([r for r in rs if r['taxonomy'] not in ['N','P']]),**{k:metrics([r for r in rs if r['taxonomy']==k]) for k in sorted(set(r['taxonomy'] for r in rs))}},negativeCorrect=sum(r['returned']==0 for r in rs if r['taxonomy']=='N'),rows=rs) for name,rs in rows.items()})
assert not network_attempts
(root/'outputs/v0110-acceptance/bge-prototype.json').write_text(json.dumps(report,indent=2))
print(json.dumps({k:v for k,v in report.items() if k!='results'},indent=2))
for name,r in report['results'].items():print(name,r['metrics']['all'],r['metrics']['C'],r['metrics']['D'])
