// Lab-only numerical boundary; no model download, archive or production index.
const fail=()=>{throw new Error('invalid semantic lab projection');};
const same=(a,b)=>a.title===b.title&&a.body===b.body
  &&a.source===b.source&&a.time===b.time&&a.excluded===b.excluded;

export function validateUnitVector(value,dimension) {
  if(!Array.isArray(value)||value.length!==dimension||value.some(x=>!Number.isFinite(x)))fail();
  const norm=Math.hypot(...value);
  if(norm<.99||norm>1.01)fail();
  return Object.freeze([...value]);
}

export async function buildSemanticLabIndex(records,encode,{dimension,minimumScore=.7}={}) {
  if(!Array.isArray(records)||!records.length||typeof encode!=='function'
      ||!Number.isInteger(dimension)||dimension<2||dimension>4096
      ||!Number.isFinite(minimumScore)||minimumScore<0||minimumScore>1)fail();
  const vectors=new Map(),snapshots=new Map();
  for(const record of records) {
    if(typeof record.id!=='string'||!record.id||vectors.has(record.id)
        ||record.excluded!==false||typeof record.title!=='string'||typeof record.body!=='string')fail();
    const vector=validateUnitVector(await encode('passage: '+record.title+'\n'+record.body),dimension);
    vectors.set(record.id,vector);snapshots.set(record.id,Object.freeze({...record}));
  }
  const score=async(eligible,query)=>{
    if(!Array.isArray(eligible)||typeof query!=='string')fail();
    const seen=new Set();
    for(const record of eligible) {
      if(!record||!snapshots.has(record.id)||seen.has(record.id)||record.excluded!==false
          ||!same(record,snapshots.get(record.id)))fail();
      seen.add(record.id);
    }
    if(!query.trim()||!eligible.length)return [];
    const q=validateUnitVector(await encode('query: '+query),dimension);
    return eligible.map(record=>({id:record.id,
      score:vectors.get(record.id).reduce((sum,x,i)=>sum+x*q[i],0)}));
  };
  return Object.freeze({
    projectedRecords:vectors.size,dimension,
    float32ProjectionBytes:vectors.size*dimension*4,
    serializedProjectionBytes:new TextEncoder().encode(JSON.stringify([...vectors])).length,
    // Invocation-owned unthresholded scores for independent lab calibration.
    // Not persisted or exposed by the extension runtime.
    score,
    async retrieve(eligible,query) {
      return (await score(eligible,query))
        .filter(row=>row.score>=minimumScore)
        .sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id))
        .slice(0,5).map(row=>row.id);
    }
  });
}

// Fixed lab-only hybrid rule, declared before its first measured result.
// Equal reciprocal-rank contributions; never inspect labels, beliefs or scores
// from unrelated scope. Semantic admission/0.7 cutoff remains upstream unchanged.
export const HYBRID_RANK_RULE=Object.freeze({algorithm:'reciprocal_rank_fusion',constant:60,
  lexicalWeight:1,semanticWeight:1,limit:5,productionClaim:false});
export function fuseScopedLabRanks(eligible,lexical,semantic) {
  if(!Array.isArray(eligible)||!Array.isArray(lexical)||!Array.isArray(semantic))fail();
  const allowed=new Set();
  for(const row of eligible){
    if(!row||typeof row.id!=='string'||!row.id||row.excluded!==false||allowed.has(row.id))fail();
    allowed.add(row.id);
  }
  for(const ranking of [lexical,semantic]){
    if(ranking.length>5||new Set(ranking).size!==ranking.length
      ||ranking.some(id=>typeof id!=='string'||!allowed.has(id)))fail();
  }
  const rows=new Map();
  for(const [kind,ranking]of [['lexical',lexical],['semantic',semantic]])
    for(const [position,id]of ranking.entries()){
      const row=rows.get(id)||{id,score:0,lexical:Infinity,semantic:Infinity};
      row.score+=1/(HYBRID_RANK_RULE.constant+position+1);
      row[kind]=position;rows.set(id,row);
    }
  return [...rows.values()].sort((a,b)=>b.score-a.score||a.lexical-b.lexical
    ||a.semantic-b.semantic||a.id.localeCompare(b.id)).slice(0,5).map(row=>row.id);
}
