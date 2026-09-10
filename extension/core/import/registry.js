import {officialExportAdapter,PROFILE} from './chatgpt-export.js';
// Authorized structural support is separate from real-file compatibility evidence.
export const VERIFIED_EXPORT_ADAPTER_IDS=Object.freeze([]);
export const SUPPORTED_EXPORT_ADAPTER_IDS=Object.freeze([PROFILE.id]);
export const officialExportStatus=()=>({provider:'official_export',schemaVerified:false,realExportVerified:false,available:true,profiles:[PROFILE]});
export const getOfficialExportAdapter=()=>officialExportAdapter;
