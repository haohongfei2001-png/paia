import {ArchiveError} from './constants.js';
import {createContextPackage,contextPackageEnvelope,contextPackageExpired} from './context-package.js';

const invalid=()=>{throw new ArchiveError('INVALID_REQUEST');};
const idOK=value=>typeof value==='string'&&value.length>0&&value.length<=200;

// Trusted Context export path. Product analytics may observe outcomes but never
// authorizes, binds, reconstructs or releases Context text.
export class ContextPackageService {
 constructor(memory,passport,{clock=()=>Date.now(),uuid=()=>crypto.randomUUID()}={}){
  this.memory=memory;this.passport=passport;this.clock=clock;this.uuid=uuid;this.packages=new Map();
 }
 prune(){for(const [id,pkg]of this.packages)if(contextPackageExpired(pkg,this.clock()))this.packages.delete(id);}
 package(previewId){this.prune();if(!idOK(previewId))invalid();const pkg=this.packages.get(previewId);if(!pkg)throw new ArchiveError('MEMORY_STALE');return pkg;}
 register(result,options={}){
  this.prune();const budget=['short','standard','detailed'].includes(options.budget)?options.budget:(result.budget||'standard');
  const pkg=createContextPackage({packageId:this.uuid(),previewId:result.previewId,profileId:options.profileId||'default',consumer:'manual',purpose:'current_task',budget,generation:result.generation||0,itemCount:result.items?.length||0,characters:result.characters||0,tokens:result.tokens||0,retrievalConfidence:result.retrievalConfidence||'low',partial:result.partial===true,createdAt:this.clock()});
  this.packages.set(result.previewId,pkg);return pkg;
 }
 async build(options={}){
  const result=await this.memory.build(options),pkg=this.register(result,options);
  return {...result,contextPackage:pkg};
 }
 async bind(previewId,grantId){
  if(!idOK(grantId))invalid();const current=this.package(previewId);
  if(current.grantId!==null){if(current.grantId===grantId)return current;throw new ArchiveError('MEMORY_DENIED');}
  const grant=await this.passport.resolve(grantId,{profileId:current.profileId});
  const bound=createContextPackage({...current,grantId,consumer:grant.consumer,purpose:grant.purpose,createdAt:Date.parse(current.createdAt)});
  this.packages.set(previewId,bound);return bound;
 }
 async share({previewId,grantId,format='copy',removed=[]}={}){
  if(!['copy','markdown'].includes(format)||!Array.isArray(removed)||removed.length>200)invalid();const current=this.package(previewId);
  if(current.grantId!==null){
   if(grantId!==current.grantId)throw new ArchiveError('MEMORY_DENIED');
   await this.passport.authorize({grantId,consumer:current.consumer,purpose:current.purpose,profileId:current.profileId});
   const result=await this.memory.share({previewId,format,removed});
   await this.passport.consume(grantId,format);
   const next={...current,generation:result.generation||current.generation,characters:result.characters||current.characters,tokens:result.tokens||current.tokens};this.packages.set(previewId,next);
   return {...result,contextPackage:contextPackageEnvelope(next,result.text,{format:format==='markdown'?'markdown':'plain',generation:next.generation}).package};
  }
  if(grantId!==undefined)throw new ArchiveError('MEMORY_DENIED');
  const result=await this.memory.share({previewId,format,removed});
  await this.passport.audit({consumer:'manual',purpose:'current_task',profileId:current.profileId,action:format==='markdown'?'manual_markdown':'manual_copy'}).catch(()=>{});
  const next={...current,generation:result.generation||current.generation,characters:result.characters||current.characters,tokens:result.tokens||current.tokens};this.packages.set(previewId,next);
  return {...result,contextPackage:contextPackageEnvelope(next,result.text,{format:format==='markdown'?'markdown':'plain',generation:next.generation}).package};
 }
}
