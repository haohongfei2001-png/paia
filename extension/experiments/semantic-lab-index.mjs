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
  return Object.freeze({
    projectedRecords:vectors.size,dimension,
    float32ProjectionBytes:vectors.size*dimension*4,
    serializedProjectionBytes:new TextEncoder().encode(JSON.stringify([...vectors])).length,
    async retrieve(eligible,query) {
      if(!Array.isArray(eligible)||typeof query!=='string')fail();
      const seen=new Set();
      for(const record of eligible) {
        if(!snapshots.has(record.id)||seen.has(record.id)||record.excluded!==false
            ||!same(record,snapshots.get(record.id)))fail();
        seen.add(record.id);
      }
      if(!query.trim()||!eligible.length)return [];
      const q=validateUnitVector(await encode('query: '+query),dimension);
      return eligible.map(record=>({id:record.id,
        score:vectors.get(record.id).reduce((sum,x,i)=>sum+x*q[i],0)}))
        .filter(row=>row.score>=minimumScore)
        .sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id))
        .slice(0,5).map(row=>row.id);
    }
  });
}
