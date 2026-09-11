import {prefix,rankBetween} from './thought-model.js';

const DEFAULT_RANK=rankBetween();
const validRank=value=>typeof value==='string'&&/^\d{12}$/.test(value);
export const validTopicGeneration=value=>Number.isSafeInteger(value)&&value>=1;
const validIndexNumber=value=>typeof value==='number'&&Number.isFinite(value);

export function topicIndexable(row){
 return !!row&&row.lifecycle==='active'&&!row.redirectTo&&(row.activeKey===0)&&(row.pinKey===0||row.pinKey===1)&&validRank(row.pinRank)&&validIndexNumber(row.negativeUpdatedSequence)&&typeof row.id==='string';
}

export function normalizeTopicIndexMetadata(row){
 let changed=false;
 if(!row||typeof row!=='object')return {changed,indexable:false};
 if(['active','merged','removed'].includes(row.lifecycle)){
  const activeKey=row.lifecycle==='active'&&!row.redirectTo?0:1;
  if(row.activeKey!==activeKey){row.activeKey=activeKey;changed=true;}
 }
 if(row.lifecycle==='active'&&!row.redirectTo){
  if(row.pinKey!==0&&row.pinKey!==1){row.pinKey=1;changed=true;}
  if(!validRank(row.pinRank)){row.pinRank=DEFAULT_RANK;changed=true;}
  if(!validIndexNumber(row.negativeUpdatedSequence)){
   const sequence=Number.isSafeInteger(row.updatedSequence)&&row.updatedSequence>=0?row.updatedSequence:0;
   row.negativeUpdatedSequence=-sequence;changed=true;
  }
  if(typeof row.name==='string'&&typeof row.nameKey!=='string'){row.nameKey=row.name.toLocaleLowerCase();changed=true;}
 }
 return {changed,indexable:topicIndexable(row)};
}

async function activeSectionFor(t,row,generation){
 if(!validTopicGeneration(generation))return null;
 if(typeof row.defaultSectionId==='string'&&row.defaultSectionId){
  const section=await t.get('sections',JSON.stringify([row.id,generation,row.defaultSectionId]));
  if(section?.topicId===row.id&&section.layoutGeneration===generation&&section.lifecycle==='active'&&!section.redirectTo)return section;
 }
 const section=await t.edge('sections','byTopicOrder',prefix([row.id,generation,0]));
 return section?.lifecycle==='active'&&!section.redirectTo?section:null;
}

export async function inferTopicGeneration(t,row){
 if(validTopicGeneration(row.activeLayoutGeneration))return {generation:row.activeLayoutGeneration,source:'stored'};
 if(row.lifecycle!=='active'||row.redirectTo||row.layoutJobId)return {generation:null,source:'unresolved'};
 const candidates=[];
 if(validTopicGeneration(row.layoutSequence))candidates.push([row.layoutSequence,'layout_sequence']);
 if(!validTopicGeneration(row.layoutSequence)||row.layoutSequence===1)candidates.push([1,'legacy_generation_1']);
 for(const [generation,source]of candidates){if(await activeSectionFor(t,row,generation))return {generation,source};}
 return {generation:null,source:'unresolved'};
}

export async function repairTopicCompatibility(t,row){
 const active=row?.lifecycle==='active'&&!row.redirectTo;
 let changed=false,repairedIndex=false,repairedGeneration=false,repairedDefaultSection=false,unresolvedLayout=false;
 const index=normalizeTopicIndexMetadata(row);changed||=index.changed;repairedIndex=index.changed;
 if(active&&!validTopicGeneration(row.activeLayoutGeneration)){
  const inferred=await inferTopicGeneration(t,row);
  if(inferred.generation){row.activeLayoutGeneration=inferred.generation;changed=true;repairedGeneration=true;}
  else unresolvedLayout=true;
 }
 if(active&&validTopicGeneration(row.activeLayoutGeneration)){
  const section=await activeSectionFor(t,row,row.activeLayoutGeneration);
  if(section&&!row.defaultSectionId){row.defaultSectionId=section.sectionId;changed=true;repairedDefaultSection=true;}
  if(section&&row.defaultSectionId===section.sectionId&&section.isDefault!==true){section.isDefault=true;await t.put('sections',section);repairedDefaultSection=true;}
 }
 if(changed)await t.put('topics',row);
 return {active,changed,repairedIndex,repairedGeneration,repairedDefaultSection,unresolvedLayout,indexable:topicIndexable(row)};
}
