// Node-only synthetic evaluation. Never imported by the extension runtime.
// Relevance labels do not assert the author's current beliefs or approve export.
import {createHash} from 'node:crypto';
import {rankAll} from '../core/memory/retrieval.js';

const CATEGORIES = new Set(['lexical','paraphrase_zh','fuzzy_recollection','no_shared_keywords',
  'negation','correction','quotation_vs_belief','no_answer','date_constraint',
  'source_constraint','date_source_constraint','exclusion','unknown_time']);
const METHODS = new Set(['lexical-production-v1','character-tfidf-lab-v1','unselected-semantic-lab-v1','multilingual-e5-small-onnx-lab-v1','official-multilingual-minilm-onnx-lab-v1']);
const SOURCES = new Set(['chatgpt','claude']);
const ROLES = new Set(['statement','quotation','historical','correction','proposal','question','hypothesis','recollection']);
const iso = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const fail = () => { throw new Error('invalid synthetic retrieval benchmark'); };
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).every(key => keys.includes(key));

export function validateRetrievalCorpus(corpus) {
  if (!corpus || corpus.schemaVersion !== 1 || corpus.scope !== 'synthetic_only'
      || corpus.productionClaim !== false || corpus.id !== 'cpv1-vs07-synthetic-fixed-v1'
      || corpus.labels !== 'independently_authored_before_candidate_selection'
      || !Array.isArray(corpus.records) || !corpus.records.length
      || !Array.isArray(corpus.tasks) || !corpus.tasks.length) fail();
  const records = new Map();
  for (const record of corpus.records) {
    if (!exactKeys(record,['id','title','body','time','source','evidenceRole','excluded'])
        || !/^r\d{2}$/.test(record.id) || records.has(record.id)
        || typeof record.title !== 'string' || typeof record.body !== 'string' || !record.body.trim()
        || !SOURCES.has(record.source) || !ROLES.has(record.evidenceRole)
        || typeBoolean(record.excluded) === false
        || !(record.time === null || iso(record.time))) fail();
    records.set(record.id,record);
  }
  const taskIds = new Set();
  for (const task of corpus.tasks) {
    if (!exactKeys(task,['id','category','query','filters','relevance','judgment'])
        || !/^t\d{2}$/.test(task.id) || taskIds.has(task.id) || !CATEGORIES.has(task.category)
        || typeof task.query !== 'string' || !task.query.trim()
        || task.judgment !== 'retrieval_relevance_only_not_current_belief'
        || !exactKeys(task.filters,['fromInclusive','toExclusive','sources','timeKnowledge'])
        || !exactKeys(task.relevance,[...records.keys()])) fail();
    const f=task.filters;
    if (f.fromInclusive !== undefined && !iso(f.fromInclusive)
        || f.toExclusive !== undefined && !iso(f.toExclusive)
        || f.fromInclusive && f.toExclusive && f.fromInclusive >= f.toExclusive
        || f.timeKnowledge !== undefined && f.timeKnowledge !== 'unknown'
        || f.timeKnowledge === 'unknown' && (f.fromInclusive || f.toExclusive)
        || f.sources !== undefined && (!Array.isArray(f.sources) || !f.sources.length
          || new Set(f.sources).size !== f.sources.length || f.sources.some(s=>!SOURCES.has(s)))) fail();
    if (task.category === 'no_answer' && Object.keys(task.relevance).length
        || task.category !== 'no_answer' && !Object.keys(task.relevance).length) fail();
    const eligible=new Set(eligibleRecords(corpus,task).map(record=>record.id));
    for (const [id,grade] of Object.entries(task.relevance))
      if (!eligible.has(id) || !Number.isInteger(grade) || grade < 1 || grade > 3) fail();
    taskIds.add(task.id);
  }
  return true;
}
function typeBoolean(value) { return typeof value === 'boolean'; }

export function eligibleRecords(corpus,task) {
  const f=task.filters;
  return corpus.records.filter(record=>!record.excluded
    && (!f.sources || f.sources.includes(record.source))
    && (f.timeKnowledge !== 'unknown' || record.time === null)
    && (!f.fromInclusive || record.time !== null && record.time >= f.fromInclusive)
    && (!f.toExclusive || record.time !== null && record.time < f.toExclusive));
}
function candidates(records) {
  return records.map((record,sequence)=>Object.freeze({...record,kind:'input',
    topicId:record.id,topicName:'',sectionTitle:'',human:true,pinned:false,confidence:1,sequence}));
}
export function productionLexicalCandidate(records,query) {
  return rankAll(candidates(records),query).slice(0,5).map(record=>record.id);
}

const grams = text => {
  const characters=[...text.normalize('NFKC').toLowerCase()].filter(c=>/[\p{L}\p{N}]/u.test(c));
  const counts=new Map();
  for (let i=0;i+1<characters.length;i++) {
    const gram=characters[i]+characters[i+1]; counts.set(gram,(counts.get(gram)||0)+1);
  }
  return counts;
};

// Reusable invocation-owned lab projection. It is statistical lexical retrieval,
// NOT semantic evidence, a persisted truth store, or a production index.
export function buildCharacterIndex(records) {
  const documents=new Map(records.map(record=>[record.id,grams(record.title+'\n'+record.body)]));
  const frequencies=new Map();
  for(const terms of documents.values())for(const term of terms.keys())
    frequencies.set(term,(frequencies.get(term)||0)+1);
  const idf=term=>Math.log((documents.size+1)/((frequencies.get(term)||0)+1))+1;
  const vector=terms=>new Map([...terms].map(([term,count])=>[term,(1+Math.log(count))*idf(term)]));
  const vectors=new Map([...documents].map(([id,terms])=>[id,vector(terms)]));
  const norm=values=>Math.sqrt([...values.values()].reduce((sum,value)=>sum+value*value,0));
  const lengths=new Map([...vectors].map(([id,values])=>[id,norm(values)]));
  return Object.freeze({
    projectedRecords:documents.size,
    serializedProjectionBytes:new TextEncoder().encode(JSON.stringify([...vectors].map(([id,v])=>[id,[...v]]))).length,
    retrieve(eligible,query) {
      const q=vector(grams(query)),qNorm=norm(q);
      if(!qNorm)return [];
      return eligible.map(record=>{
        const v=vectors.get(record.id),length=lengths.get(record.id);
        const score=v&&length?[...q].reduce((sum,[term,weight])=>sum+weight*(v.get(term)||0),0)/(qNorm*length):0;
        return {id:record.id,score};
      }).filter(record=>record.score>0).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id))
        .slice(0,5).map(record=>record.id);
    }
  });
}

const average = values=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
const percentile = (values,fraction)=>{
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b);
  return sorted[Math.max(0,Math.ceil(sorted.length*fraction)-1)];
};
const dcg = grades=>grades.reduce((sum,grade,index)=>sum+(2**grade-1)/Math.log2(index+2),0);

export async function evaluateRetrieval(corpus,candidate,{method}={}) {
  validateRetrievalCorpus(corpus);
  if(!METHODS.has(method) || typeof candidate !== 'function') fail();
  const rows=[],durations=[];
  for(const task of corpus.tasks) {
    const eligible=Object.freeze(eligibleRecords(corpus,task).map(record=>Object.freeze({...record})));
    const ids=new Set(eligible.map(record=>record.id));
    let returned,reason=null;
    const start=performance.now();
    try {
      returned=await candidate(eligible,task.query);
      if(!Array.isArray(returned) || returned.length>5 || returned.some(id=>typeof id!=='string'))
        reason='invalid_result_contract';
      else if(new Set(returned).size!==returned.length) reason='duplicate_result';
      else if(returned.some(id=>!ids.has(id))) reason='scope_or_unknown_record';
    } catch { reason='candidate_error'; }
    durations.push(performance.now()-start);
    if(reason) { rows.push({id:task.id,category:task.category,status:'ERROR',reason});continue; }
    const relevant=Object.keys(task.relevance),grades=returned.map(id=>task.relevance[id]||0);
    const first=grades.findIndex(grade=>grade>0),ideal=Object.values(task.relevance).sort((a,b)=>b-a).slice(0,5);
    rows.push({id:task.id,category:task.category,status:'MEASURED',
      reciprocalRankAt5:relevant.length?(first<0?0:1/(first+1)):null,
      recallAt5:relevant.length?returned.filter(id=>task.relevance[id]>0).length/relevant.length:null,
      ndcgAt5:ideal.length?dcg(grades)/dcg(ideal):null,
      abstained:returned.length===0,noAnswer:task.category==='no_answer'});
  }
  const measured=rows.filter(row=>row.status==='MEASURED'),positives=measured.filter(row=>!row.noAnswer),
    negatives=measured.filter(row=>row.noAnswer);
  const categories={};
  for(const category of new Set(corpus.tasks.map(task=>task.category))) {
    const subset=positives.filter(row=>row.category===category);
    categories[category]={tasks:rows.filter(row=>row.category===category).length,
      errors:rows.filter(row=>row.category===category&&row.status==='ERROR').length,
      mrrAt5:average(subset.map(row=>row.reciprocalRankAt5)),
      recallAt5:average(subset.map(row=>row.recallAt5))};
  }
  return {schemaVersion:1,corpusId:corpus.id,corpusDigest:createHash('sha256').update(JSON.stringify(corpus)).digest('hex'),scope:'synthetic_only',method,
    productionClaim:false,semanticCapabilityEstablished:false,personalBeliefJudgment:false,
    taskCount:corpus.tasks.length,recordCount:corpus.records.length,
    measuredTasks:measured.length,contractFailures:rows.length-measured.length,
    aggregate:{mrrAt5:average(positives.map(row=>row.reciprocalRankAt5)),
      recallAt5:average(positives.map(row=>row.recallAt5)),ndcgAt5:average(positives.map(row=>row.ndcgAt5)),
      noAnswerAbstention:average(negatives.map(row=>+row.abstained))},
    retrievalTiming:{sampleCount:durations.length,p50Ms:percentile(durations,.5),
      p95Ms:percentile(durations,.95),scope:'this_fixed_synthetic_corpus_not_long_library'},
    categories,rows};
}
