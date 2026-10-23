import * as stage from './canonical-generation-checkpoint-stage.js';
import * as human from './canonical-generation-human-restore.js';
import * as publication from './canonical-generation-publication.js';
import {ArchiveError} from '../constants.js';

// A permanent opt-in shadow guard. Tokens are created only inside the fixed
// original consumers; caller options/constructor fields never mint a writer.
export const CANONICAL_REPOSITORY_PROTECTION='canonical-generation:repository-protection:v1';
export const CANONICAL_REPOSITORY_GATE='canonical-generation:gate:v1';
const fail=()=>{throw new ArchiveError('GENERATION_REPOSITORY_WRITE_DENIED');};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function readOriginalGenerationRepositoryAuthority(token,repository,scope){
 for(const [module,name]of [[stage,'readOriginalCheckpointRepositoryAuthority'],[human,'readOriginalHumanRepositoryAuthority'],[publication,'readOriginalPublicationRepositoryAuthority']]){
  const read=module[name];if(typeof read!=='function')continue;const value=read(token,repository,scope);if(value!==null)return value;
 }
 return null;
}
export function originalGenerationProtection(marker,gate,databaseName){
 if(!marker||Object.keys(marker).sort().join(',')!=='id,identity,mode,registryName,version'||marker.id!==CANONICAL_REPOSITORY_PROTECTION||marker.version!==1||marker.mode!=='shadow-v1'||!gate||gate.id!==CANONICAL_REPOSITORY_GATE||gate.version!==1||gate.identity?.databaseName!==databaseName||!same(marker.identity,gate.identity)||marker.registryName!==gate.registryName||!['staging','sealed','active','retired','invalidated','deleting'].includes(gate.phase))fail();
 return marker;
}
export function originalGenerationRepositoryAdmission(authority,marker,gate,databaseName){
 if(!authority)fail();if(marker!=null)originalGenerationProtection(marker,gate,databaseName);else if(authority.kind!=='checkpoint-install'||!gate||gate.identity?.databaseName!==databaseName||gate.phase!=='staging')fail();
 if(['checkpoint','checkpoint-install','human'].includes(authority.kind)&&gate.phase!=='staging')fail();
 if(!['checkpoint','checkpoint-install','human','publication','publication-seal'].includes(authority.kind))fail();
 if(authority.identity&&!same(authority.identity,gate.identity))fail();return true;
}
export function originalGenerationRepositoryMutation(authority,table,key,method){
 if(!authority)fail();if(method==='clear')fail();
 if(table==='meta'&&key===CANONICAL_REPOSITORY_PROTECTION){if(authority.kind!=='checkpoint-install'||method!=='put')fail();return;}
 if(authority.kind==='human'){if(table==='meta'&&key===CANONICAL_REPOSITORY_GATE)fail();return;}
 if(table!=='meta')fail();
 if(['publication','publication-seal'].includes(authority.kind)){if(method!=='put'||key!==CANONICAL_REPOSITORY_GATE&&!(authority.kind==='publication-seal'&&key==='canonical-generation:qualified-graph:v1'))fail();return;}
 if(key===CANONICAL_REPOSITORY_GATE){if(method!=='put')fail();return;}
 if(typeof key!=='string'||!key.startsWith('canonical-generation:checkpoint:'))fail();
}
export function originalGenerationRepositorySettlement(authority,marker,before,after,databaseName){
 originalGenerationProtection(marker,after,databaseName);
 if(!same(before.identity,after.identity)||before.registryName!==after.registryName)fail();
 if(authority.kind==='human'&&!same(before,after))fail();
 if(['checkpoint','checkpoint-install'].includes(authority.kind)&&!same({...before,writeRevision:before.writeRevision+1},after))fail();
 return true;
}
