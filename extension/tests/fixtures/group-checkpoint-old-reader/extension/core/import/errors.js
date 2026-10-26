import {ArchiveError} from '../constants.js';
export const IMPORT_CODES=new Set(['FORBIDDEN','INVALID_REQUEST','CONSENT_REQUIRED','FILE_INVALID','CANCELLED','RESOURCE_LIMIT','UTF8_INVALID','JSON_INVALID','JSON_DEPTH','JSON_KEY_LIMIT','JSON_STRING_LIMIT','JSON_DUPLICATE_KEY','ZIP_INVALID','ZIP_PATH','ZIP_DUPLICATE_ENTRY','ZIP64_UNSUPPORTED','ZIP_MULTIDISK','ZIP_ENCRYPTED','ZIP_COMPRESSION','ZIP_RATIO','ZIP_INTEGRITY','ZIP_NO_CONVERSATIONS','ZIP_NESTED','SCHEMA_UNSUPPORTED','PAIA_BACKUP_FILE','SCHEMA_UNVERIFIED','INVALID_IMPORT','IMPORT_SESSION_EXPIRED','IMPORT_FILE_MISMATCH','IMPORT_BATCH_MISMATCH','IMPORT_STATE','STORAGE_FAILED','STORAGE_FULL']);
export class ImportError extends ArchiveError {constructor(code){super(IMPORT_CODES.has(code)?code:'INVALID_IMPORT');this.code=this.message;}}
export const fail=code=>{throw new ImportError(code);};
export const safeImportError=e=>e instanceof ArchiveError&&IMPORT_CODES.has(e.code)?e.code:'STORAGE_FAILED';
export const LIMITS=Object.freeze({chunkBytes:65536,fileBytes:1024*1024*1024,totalBytes:1024*1024*1024,entryBytes:512*1024*1024,entries:10000,candidates:128,directoryBytes:16*1024*1024,ratio:200,depth:48,keys:8192,keyChars:256,stringChars:200000,batchRows:32,batchBytes:512*1024,rows:1000000});
export function limits(input={}){for(const k of Object.keys(input))if(!Object.hasOwn(LIMITS,k)||!Number.isSafeInteger(input[k])||input[k]<1||input[k]>LIMITS[k])fail('RESOURCE_LIMIT');return {...LIMITS,...input};}
export function allowed(file,o){if(o?.consent!==true)fail('CONSENT_REQUIRED');if(o.signal?.aborted)fail('CANCELLED');if(!Number.isSafeInteger(file?.size)||file.size<1||file.size>limits(o.limits).fileBytes)fail('FILE_INVALID');}
export function checkStop(o){if(o.signal?.aborted)fail('CANCELLED');}
