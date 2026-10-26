import {officialExportAdapter,PROFILE as CHATGPT_PROFILE} from './chatgpt-export.js';
import {claudeExportAdapter,CLAUDE_PROFILE} from './claude-export.js';
const adapters=Object.freeze([officialExportAdapter,claudeExportAdapter]);
const byId=new Map(adapters.map(adapter=>[adapter.id,adapter]));
// Authorized structural support is separate from real-file compatibility evidence.
export const VERIFIED_EXPORT_ADAPTER_IDS=Object.freeze([]);
export const SUPPORTED_EXPORT_ADAPTER_IDS=Object.freeze(adapters.map(adapter=>adapter.id));
export const OFFICIAL_EXPORT_PROFILES=Object.freeze([CHATGPT_PROFILE,CLAUDE_PROFILE]);
export const officialExportStatus=()=>({provider:'official_export',schemaVerified:false,realExportVerified:false,available:true,profiles:OFFICIAL_EXPORT_PROFILES});
export const getOfficialExportAdapters=()=>adapters;
export const getOfficialExportAdapter=(id=CHATGPT_PROFILE.id)=>byId.get(id)||null;
