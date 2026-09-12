import {allowed,fail,LIMITS} from './errors.js';
import {inspectFile} from './reader.js';
import * as registry from './registry.js';
const fresh=adapter=>({adapter,projection:null,conversations:0,userMessages:0,issues:0,review:0,unknownEntries:0,maxNodes:0,maxBufferedTextChars:0,skippedConversations:0,skippedMessages:0,invalidTimes:0,backup:false});
const availableAdapters=()=>typeof registry.getOfficialExportAdapters==='function'?registry.getOfficialExportAdapters():[registry.getOfficialExportAdapter?.()].filter(Boolean);
async function detectWithAdapters(file,adapters,options={}){
 allowed(file,options);
 // PAIA Backup is NDJSON. Only its bounded first header line is considered here.
 const prefix=new Uint8Array(await file.slice(0,Math.min(file.size,65536)).arrayBuffer());
 if(prefix[0]===123){try{const line=new TextDecoder('utf-8',{fatal:true}).decode(prefix).split('\n',1)[0],header=JSON.parse(line);if(header.type==='header'&&header.format==='PAIA Backup'&&header.formatVersion===1)return {support:'paia_backup',realExportVerified:false,conversations:0,userMessages:0};}catch{}}
 const states=adapters.map(fresh);if(!states.length)fail('SCHEMA_UNVERIFIED');
 const integrity=await inspectFile(file,{...options,candidateMode:'structural',
  selectString:path=>states.some(s=>s.projection?.selectString(path)===true),
  onEntry:()=>{for(const s of states)s.projection=s.adapter.createProjection();},
  onEvent:e=>Promise.all(states.map(s=>s.projection.event(e,()=>{}))),
  onEntryEnd:()=>{for(const s of states){const r=s.projection.finish();s.backup||=r.support==='paia_backup';s.unknownEntries+=r.support==='unknown'?1:0;s.skippedConversations+=r.skippedConversations||0;s.skippedMessages+=r.skippedMessages||0;s.invalidTimes+=r.invalidTimes||0;s.conversations+=r.conversations||0;s.userMessages+=r.userMessages||0;if(s.userMessages>LIMITS.rows)fail('RESOURCE_LIMIT');s.issues+=r.issues||0;s.review+=r.review||0;s.maxNodes=Math.max(s.maxNodes,r.maxNodes||0);s.maxBufferedTextChars=Math.max(s.maxBufferedTextChars,r.maxBufferedTextChars||0);s.projection=null;}}
 });
 if(states.some(s=>s.backup))return {...integrity,fileBytes:file.size,support:'paia_backup',realExportVerified:false,conversations:0,userMessages:0};
 const matches=states.filter(s=>s.conversations>0&&s.userMessages>0);if(matches.length!==1)return {...integrity,fileBytes:file.size,support:'unknown',realExportVerified:false,conversations:0,userMessages:0,ambiguousProfiles:matches.map(s=>s.adapter.id)};
 const s=matches[0],profile=s.adapter.profile;return {...integrity,fileBytes:file.size,adapterId:s.adapter.id,platform:profile.platform||'chatgpt',profileId:profile.id,profileVersion:profile.version,realExportVerified:false,support:s.issues||s.review||s.unknownEntries?'partial':'supported',conversations:s.conversations,userMessages:s.userMessages,issues:s.issues,review:s.review,unknownEntries:s.unknownEntries,maxNodes:s.maxNodes,maxBufferedTextChars:s.maxBufferedTextChars,skippedConversations:s.skippedConversations,skippedMessages:s.skippedMessages,invalidTimes:s.invalidTimes};
}
// Automatic user-facing detection evaluates every registered structural projection
// in one bounded file pass and refuses ambiguous matches.
export function detectHistoryFile(file,options={}){return detectWithAdapters(file,availableAdapters(),options);}
// A caller that already owns a trusted adapter should not pay the multi-adapter
// projection cost or allow unrelated adapters to change that explicit contract.
export function detectHistoryFileForAdapter(file,adapter,options={}){if(!adapter?.id||typeof adapter.createProjection!=='function')fail('SCHEMA_UNVERIFIED');return detectWithAdapters(file,[adapter],options);}
export class ExportFormatDetector { detect(file,options){return detectHistoryFile(file,options);} }
