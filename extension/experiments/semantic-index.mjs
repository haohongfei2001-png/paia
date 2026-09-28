// Rebuildable, in-memory derived vectors. No body store, model loader or authority.
// The owner supplies a complete CURRENT eligible snapshot and a local encoder.
// Archived experiment only; excluded from the packaged extension runtime.
import {hashText} from '../core/dedupe.js';
import {validMaterialRef,materialIdentity} from '../core/manual-materials.js';
import {historicalInstant} from '../core/historical-time.js';
import {prepareSearchQuery,rankLexicalCandidate} from '../core/search-service.js';

const fail=()=>{throw Error('semantic_index_invalid');};
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)
 &&Object.keys(v).every(k=>keys.includes(k));
const id=v=>typeof v==='string'&&v.length>0&&v.length<=200;
const integer=v=>Number.isSafeInteger(v)&&v>=0;
const vector=(value,dimension)=>{
 if(!(Array.isArray(value)||value instanceof Float32Array)||value.length!==dimension)fail();
 let norm=0;for(const x of value){if(typeof x!=='number'||!Number.isFinite(x))fail();norm+=x*x;}
 if(norm<.9801||norm>1.0201)fail();
 // Admission tolerance accommodates float rounding, not a score multiplier.
 // Normalize the owned copy so cosine thresholds do not depend on scale.
 const scale=Math.sqrt(norm);
 return Float32Array.from(value,x=>x/scale);
};
function material(raw){
 if(!exact(raw,['ref','title','body','source','time','locations'])||!validMaterialRef(raw.ref)
  ||raw.ref.span!==undefined||typeof raw.title!=='string'||typeof raw.body!=='string'
  ||!id(raw.source)||raw.time!==null&&historicalInstant(raw.time)===null
  ||!Array.isArray(raw.locations))fail();
 const locations=raw.locations.map(p=>{
  if(!exact(p,['topicId','sectionId','topicName'])||!id(p.topicId)
   ||p.sectionId!==null&&!id(p.sectionId)||typeof p.topicName!=='string')fail();
  return {topicId:p.topicId,sectionId:p.sectionId,topicName:p.topicName};
 }).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 return {ref:structuredClone(raw.ref),title:raw.title,body:raw.body,
  source:raw.source,time:raw.time,locations};
}

export class DerivedSemanticIndex{
 constructor({readEligible,encode,model,maxItems=100000,maxVectorBytes=268435456}={}){
  if(typeof readEligible!=='function'||typeof encode!=='function'
   ||!exact(model,['id','revision','dimension'])||!id(model.id)
   ||typeof model.revision!=='string'||!/^[a-f0-9]{40}$/.test(model.revision)
   ||!Number.isSafeInteger(model.dimension)||model.dimension<2||model.dimension>4096
   ||!Number.isSafeInteger(maxItems)||maxItems<1||maxItems>100000
   ||!Number.isSafeInteger(maxVectorBytes)||maxVectorBytes<8||maxVectorBytes>268435456)fail();
  this.readEligible=readEligible;this.encode=encode;this.model=Object.freeze({...model});
  this.maxItems=maxItems;this.maxVectorBytes=maxVectorBytes;this.rows=new Map();
  this.epoch=0;this.state='empty';this.expected=0;this.checkedGeneration=null;
 }
 async snapshot(){
  const raw=await this.readEligible();
  if(!exact(raw,['scope','generation','items'])||!id(raw.scope)||!integer(raw.generation)
   ||!Array.isArray(raw.items)||raw.items.length>this.maxItems
   ||raw.items.length*this.model.dimension*4>this.maxVectorBytes)fail();
  const scope=raw.scope,generation=raw.generation,items=raw.items.map(material);
  const seen=new Set();
  for(const row of items){const key=materialIdentity(row.ref);if(seen.has(key))fail();seen.add(key);}
  // Bound pending Web Crypto requests for large eligible libraries. Preserve
  // the complete snapshot and its exact per-material digest and ordering.
  const bindings=[];
  for(let start=0;start<items.length;start+=128){
   const batch=await Promise.all(items.slice(start,start+128).map(async row=>({
    key:materialIdentity(row.ref),digest:await hashText(JSON.stringify([this.model,scope,row])),row
   })));
   bindings.push(...batch);
  }
  bindings.sort((a,b)=>a.key.localeCompare(b.key));
  return {scope,generation,bindings,signature:await hashText(JSON.stringify([
   scope,generation,bindings.map(x=>[x.key,x.digest])
  ]))};
 }
 reconcile(snapshot){
  const expected=new Map(snapshot.bindings.map(x=>[x.key,x.digest]));
  for(const [key,row]of this.rows)if(expected.get(key)!==row.digest)this.rows.delete(key);
  this.expected=expected.size;this.checkedGeneration=snapshot.generation;
 }
 status(){
  return {state:this.state,expected:this.expected,indexed:this.rows.size,
   missing:Math.max(0,this.expected-this.rows.size),vectorBytes:this.rows.size*this.model.dimension*4,
   checkedGeneration:this.checkedGeneration,localOnly:true,storesBody:false};
 }
 invalidate(){
  this.epoch++;this.rows.clear();this.expected=0;this.checkedGeneration=null;this.state='empty';
  return this.status();
 }
 async coverage(){
  const epoch=this.epoch;
  try{
   const current=await this.snapshot();if(epoch!==this.epoch)return this.status();
   this.reconcile(current);
   if(this.state!=='building')this.state=this.rows.size===this.expected?'ready':'partial';
  }catch{if(epoch===this.epoch){this.rows.clear();this.state='unavailable';this.checkedGeneration=null;}}
  return this.status();
 }
 async synchronize({rebuild=false}={}){
  if(typeof rebuild!=='boolean')fail();
  const epoch=++this.epoch;this.state='building';
  if(rebuild)this.rows.clear();
  try{
   const initial=await this.snapshot();if(epoch!==this.epoch)return {ok:false,reason:'superseded'};
   this.reconcile(initial);
   const staged=new Map(this.rows);
   for(const binding of initial.bindings){
    if(!staged.has(binding.key)){
     const result=await this.encode('document',structuredClone(binding.row),this.model);
     if(epoch!==this.epoch)return {ok:false,reason:'superseded'};
     staged.set(binding.key,{digest:binding.digest,vector:vector(result,this.model.dimension)});
    }
   }
   const current=await this.snapshot();
   if(epoch!==this.epoch)return {ok:false,reason:'superseded'};
   this.reconcile(current);
   if(current.signature!==initial.signature){this.state='partial';return {ok:false,reason:'authority_changed',coverage:this.status()};}
   this.rows=staged;this.state='ready';
   return {ok:true,coverage:this.status()};
  }catch{
   if(epoch!==this.epoch)return {ok:false,reason:'superseded'};
   this.rows.clear();this.state='unavailable';this.checkedGeneration=null;
   return {ok:false,reason:'index_unavailable',coverage:this.status()};
  }
 }
 async lookup(query,{limit=5,minimumScore=.7}={}){
  if(typeof query!=='string'||query.length>300||!Number.isSafeInteger(limit)||limit<1||limit>50
   ||typeof minimumScore!=='number'||!Number.isFinite(minimumScore)||minimumScore<0||minimumScore>1)fail();
  const fallback=reason=>({items:[],usedSemantic:false,reason,coverage:this.status()});
  if(!query.trim())return fallback('empty_query');
  const epoch=this.epoch;
  try{
   const initial=await this.snapshot();
   return await this._lookupFromSnapshot(query,{limit,minimumScore},initial,epoch);
  }catch{
   if(epoch===this.epoch){this.rows.clear();this.state='unavailable';this.checkedGeneration=null;}
   return fallback('index_unavailable');
  }
 }
 async _lookupFromSnapshot(query,{limit,minimumScore},initial,epoch,{deferReadback=false}={}){
  const fallback=reason=>({items:[],usedSemantic:false,reason,coverage:this.status()});
  if(epoch!==this.epoch)return fallback('authority_changed');
  this.reconcile(initial);
  if(this.state==='building')return fallback('index_building');
  if(this.rows.size!==this.expected){this.state='partial';return fallback('index_incomplete');}
  this.state='ready';
  if(!initial.bindings.length){
   // Standalone lookup verifies even an empty read. Hybrid's final complete
   // snapshot provides the same fence before any candidate can be returned.
   if(!deferReadback){
    const current=await this.snapshot();
    if(epoch!==this.epoch)return fallback('authority_changed');
    this.reconcile(current);
    if(current.signature!==initial.signature){
     this.state='partial';return fallback('authority_changed');
    }
   }
   return {items:[],usedSemantic:true,coverage:this.status()};
  }
  const q=vector(await this.encode('query',query,this.model),this.model.dimension);
  if(epoch!==this.epoch)return fallback('authority_changed');
  const current=deferReadback?initial:await this.snapshot();
  if(epoch!==this.epoch)return fallback('authority_changed');
  if(!deferReadback)this.reconcile(current);
  if(current.signature!==initial.signature){this.state='partial';return fallback('authority_changed');}
  const queryNorm=q.reduce((sum,x)=>sum+x*x,0);
  const ranked=current.bindings.map(binding=>{
   const v=this.rows.get(binding.key)?.vector;if(!v)fail();
   let score=0,documentNorm=0;
   for(let i=0;i<v.length;i++){score+=v[i]*q[i];documentNorm+=v[i]*v[i];}
   score/=Math.sqrt(documentNorm*queryNorm);
   score=Math.max(-1,Math.min(1,score)); // Float32 dot round-off only.
   return {key:binding.key,score,row:binding.row};
  }).filter(x=>x.score>=minimumScore).sort((a,b)=>b.score-a.score||a.key.localeCompare(b.key));
  return {items:ranked.slice(0,limit).map(x=>({...structuredClone(x.row),score:x.score})),
   usedSemantic:true,coverage:this.status()};
 }
 // One current, scope-bound evidence set for lexical fallback or hybrid ranking.
 // This does not admit a model or activate a production search surface.
 async lookupHybrid(query,{limit=5,minimumScore=.7}={}){
  if(typeof query!=='string'||query.length>300||!Number.isSafeInteger(limit)||limit<1||limit>50
   ||typeof minimumScore!=='number'||!Number.isFinite(minimumScore)||minimumScore<0||minimumScore>1)fail();
  const unavailable=reason=>({items:[],usedSemantic:false,mode:'unavailable',reason,coverage:this.status()});
  if(!query.trim())return unavailable('empty_query');
  const epoch=this.epoch;
  try{
   const initial=await this.snapshot();
   if(epoch!==this.epoch)return unavailable('authority_changed');
   const prepared=prepareSearchQuery(query);
   const lexical=initial.bindings.map(binding=>({
    key:binding.key,score:rankLexicalCandidate(binding.row,query,prepared).score
   })).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.key.localeCompare(b.key)).slice(0,limit);
   // Score against the first complete snapshot. The final complete snapshot
   // below fences changes after asynchronous encoding, before any result returns.
   let semantic;
   try{
    semantic=await this._lookupFromSnapshot(query,{limit,minimumScore},initial,epoch,
     {deferReadback:true});
   }catch{
    if(epoch===this.epoch){this.rows.clear();this.state='unavailable';this.checkedGeneration=null;}
    semantic={items:[],usedSemantic:false,reason:'index_unavailable'};
   }
   const current=await this.snapshot();
   if(epoch!==this.epoch)return unavailable('authority_changed');
   if(current.signature!==initial.signature){
    this.reconcile(current);
    if(this.state!=='building')this.state=this.rows.size===this.expected?'ready':'partial';
    return unavailable('authority_changed');
   }
   const eligible=new Map(current.bindings.map(x=>[x.key,x.row]));
   if(semantic.usedSemantic!==true){
    return {items:lexical.map(x=>({...structuredClone(eligible.get(x.key)),score:x.score})),
     usedSemantic:false,mode:'lexical_fallback',reason:semantic.reason,
     scope:current.scope,generation:current.generation,coverage:this.status()};
   }
   if(!Array.isArray(semantic.items)||semantic.items.length>limit)fail();
   const seen=new Set(),semanticRanks=[];
   for(const result of semantic.items){
    const {score,...raw}=result,row=material(raw),key=materialIdentity(row.ref);
    if(!eligible.has(key)||seen.has(key)||!Number.isFinite(score)||score<minimumScore
     ||JSON.stringify(row)!==JSON.stringify(eligible.get(key)))fail();
    seen.add(key);semanticRanks.push(key);
   }
   const scores=new Map(),lexicalOrder=new Map(lexical.map((x,i)=>[x.key,i]));
   for(const ranks of [lexical.map(x=>x.key),semanticRanks])
    ranks.forEach((key,i)=>scores.set(key,(scores.get(key)||0)+1/(60+i+1)));
   const ranked=[...scores].sort((a,b)=>b[1]-a[1]
    ||(lexicalOrder.get(a[0])??Infinity)-(lexicalOrder.get(b[0])??Infinity)
    ||a[0].localeCompare(b[0])).slice(0,limit);
   return {items:ranked.map(([key,score])=>({...structuredClone(eligible.get(key)),score})),
    usedSemantic:true,mode:'hybrid',scope:current.scope,generation:current.generation,
    coverage:this.status()};
  }catch{
   if(epoch===this.epoch){this.rows.clear();this.state='unavailable';this.checkedGeneration=null;}
   return unavailable('index_unavailable');
  }
 }
}
