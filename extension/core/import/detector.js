import {allowed,fail,LIMITS} from './errors.js';
import {inspectFile} from './reader.js';
import {officialExportAdapter,PROFILE} from './chatgpt-export.js';
// A complete bounded structural/integrity pass, with no persistence.
export async function detectHistoryFile(file,options={}){
 allowed(file,options);
 // PAIA Backup is NDJSON. Only its bounded first header line is considered here.
 const prefix=new Uint8Array(await file.slice(0,Math.min(file.size,65536)).arrayBuffer());
 if(prefix[0]===123){try{const line=new TextDecoder('utf-8',{fatal:true}).decode(prefix).split('\n',1)[0],header=JSON.parse(line);if(header.type==='header'&&header.format==='PAIA Backup'&&header.formatVersion===1)return {support:'paia_backup',realExportVerified:false,conversations:0,userMessages:0};}catch{}}
 let projection,conversations=0,users=0,issues=0,review=0,unknownEntries=0,backup=false,maxNodes=0,maxBufferedTextChars=0,skippedConversations=0,skippedMessages=0,invalidTimes=0;
 const integrity=await inspectFile(file,{...options,candidateMode:'structural',
  selectString:path=>projection?.selectString(path)===true,
  onEntry:()=>{projection=officialExportAdapter.createProjection();},
  onEvent:e=>projection.event(e,()=>{}),
  onEntryEnd:()=>{
   const r=projection.finish();backup||=r.support==='paia_backup';unknownEntries+=r.support==='unknown'?1:0;
   skippedConversations+=r.skippedConversations;skippedMessages+=r.skippedMessages;invalidTimes+=r.invalidTimes;conversations+=r.conversations;users+=r.userMessages;if(users>LIMITS.rows)fail('RESOURCE_LIMIT');issues+=r.issues;review+=r.review;
   maxNodes=Math.max(maxNodes,r.maxNodes);maxBufferedTextChars=Math.max(maxBufferedTextChars,r.maxBufferedTextChars);projection=null;
  }});
 return {...integrity,fileBytes:file.size,profileId:PROFILE.id,profileVersion:PROFILE.version,realExportVerified:false,support:backup?'paia_backup':!conversations?'unknown':issues||review||unknownEntries?'partial':'supported',conversations,userMessages:users,issues,review,unknownEntries,maxNodes,maxBufferedTextChars,skippedConversations,skippedMessages,invalidTimes};
}
export class ExportFormatDetector {
 detect(file,options){return detectHistoryFile(file,options);}
}
