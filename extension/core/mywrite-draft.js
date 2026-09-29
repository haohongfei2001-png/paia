import {MAX_MESSAGE_LENGTH} from './constants.js';

// Detached local-first MyWrite capability. No account, transport, Source/Input
// promotion, voice processor or mobile entrypoint is activated by this store.
const FORMAT='paia-mywrite-draft-v1';
const STORE='drafts';
const fields=['format','id','revision','createdAt','updatedAt','text','topicId','lifecycle','lastWriteId','baseRevision'];
const id=value=>typeof value==='string'&&/^[A-Za-z0-9._:-]{1,128}$/.test(value);
const time=value=>Number.isSafeInteger(value)&&value>=0;
const revision=value=>Number.isSafeInteger(value)&&value>=0&&value<Number.MAX_SAFE_INTEGER;
const topic=value=>value===null||id(value);
const content=value=>typeof value==='string'&&value.length<=MAX_MESSAGE_LENGTH;
const plain=value=>value!==null&&typeof value==='object'&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
function exact(value,keys){
 if(!plain(value))return false;
 const descriptors=Object.getOwnPropertyDescriptors(value);
 return Reflect.ownKeys(descriptors).length===keys.length&&keys.every(key=>
  Object.hasOwn(descriptors,key)&&Object.hasOwn(descriptors[key],'value'));
}
function rowValid(row){
 return exact(row,fields)&&row.format===FORMAT&&id(row.id)&&revision(row.revision)&&row.revision>=1&&
  revision(row.baseRevision)&&row.baseRevision===row.revision-1&&time(row.createdAt)&&time(row.updatedAt)&&
  row.updatedAt>=row.createdAt&&id(row.lastWriteId)&&topic(row.topicId)&&
  (row.lifecycle==='draft'?content(row.text):row.lifecycle==='deleted'&&row.text===null&&row.topicId===null);
}
export class MyWriteDraftError extends Error{
 constructor(code){super(code);this.name='MyWriteDraftError';this.code=code;}
}
const fail=code=>{throw new MyWriteDraftError(code);};
const storageCode=error=>error?.name==='QuotaExceededError'?'MYWRITE_STORAGE_FULL':'MYWRITE_UNAVAILABLE';

export class MyWriteDraftStore{
 constructor({indexedDB=globalThis.indexedDB,name='paia-mywrite-local-v1',clock=()=>Date.now()}={}){
  if(!indexedDB?.open||typeof name!=='string'||!name.startsWith('paia-mywrite-')||name.length>128||typeof clock!=='function')fail('MYWRITE_INVALID');
  this.indexedDB=indexedDB;this.name=name;this.clock=clock;this.database=null;this.opening=null;this.closed=false;
 }
 async open(){
  if(this.closed)fail('MYWRITE_CLOSED');
  if(this.database)return this.database;
  if(this.opening)return this.opening;
  this.opening=new Promise((resolve,reject)=>{
   let request,settled=false;
   const refuse=code=>{if(!settled){settled=true;reject(new MyWriteDraftError(code));}};
   try{request=this.indexedDB.open(this.name,1);}catch(error){refuse(storageCode(error));return;}
   request.onupgradeneeded=()=>{
    if(this.closed||settled){request.transaction.abort();return;}
    request.result.createObjectStore(STORE,{keyPath:'id'});
   };
   request.onerror=()=>refuse(storageCode(request.error));
   request.onblocked=()=>refuse('MYWRITE_UNAVAILABLE');
   request.onsuccess=()=>{
    const db=request.result;
    if(this.closed||settled){db.close();refuse('MYWRITE_CLOSED');return;}
    if(!db.objectStoreNames.contains(STORE)){db.close();refuse('MYWRITE_CORRUPT');return;}
    db.onversionchange=()=>{db.close();if(this.database===db)this.database=null;};
    this.database=db;settled=true;resolve(db);
   };
  }).finally(()=>{this.opening=null;});
  return this.opening;
 }
 close(){this.closed=true;this.database?.close();this.database=null;}
 async transaction(recordId,mode,operation){
  const db=await this.open();
  if(this.closed)fail('MYWRITE_CLOSED');
  return new Promise((resolve,reject)=>{
   let tx,result,error;
   try{
    tx=db.transaction(STORE,mode,mode==='readwrite'?{durability:'strict'}:undefined);
    const store=tx.objectStore(STORE),request=store.get(recordId);
    request.onsuccess=()=>{
     try{
      const row=request.result;
      if(row!==undefined&&!rowValid(row))fail('MYWRITE_CORRUPT');
      result=operation(row,store);
     }catch(cause){error=cause instanceof MyWriteDraftError?cause:new MyWriteDraftError(storageCode(cause));tx.abort();}
    };
    tx.oncomplete=()=>resolve(result===undefined?null:structuredClone(result));
    tx.onabort=()=>reject(error||new MyWriteDraftError(storageCode(tx.error)));
    // All request/transaction errors are classified at abort; payloads and
    // browser exception strings never become a receipt or public message.
   }catch(cause){reject(new MyWriteDraftError(storageCode(cause)));}
  });
 }
 async read(recordId){
  if(!id(recordId))fail('MYWRITE_INVALID');
  return this.transaction(recordId,'readonly',row=>row);
 }
 async list(options={limit:20,after:null}){
  if(!exact(options,['limit','after'])||!Number.isInteger(options.limit)||
     options.limit<1||options.limit>40||(options.after!==null&&!id(options.after)))fail('MYWRITE_INVALID');
  const {limit,after}=options,db=await this.open();
  if(this.closed)fail('MYWRITE_CLOSED');
  return new Promise((resolve,reject)=>{
   let tx,error;const items=[];let hasMore=false;
   try{
    tx=db.transaction(STORE,'readonly');
    const request=tx.objectStore(STORE).openCursor();
    request.onsuccess=()=>{
     try{
      if(this.closed)fail('MYWRITE_CLOSED');
      const cursor=request.result;if(!cursor)return;
      // Seek on the native primary key. Pages are fresh readonly views, not
      // a global cross-page snapshot or a claim about recency.
      if(after!==null&&cursor.key<after){cursor.continue(after);return;}
      if(after!==null&&cursor.key===after){cursor.continue();return;}
      const row=cursor.value;
      if(!rowValid(row)||cursor.key!==row.id)fail('MYWRITE_CORRUPT');
      if(row.lifecycle==='draft'){
       if(items.length===limit){hasMore=true;return;}
       items.push({id:row.id,revision:row.revision,createdAt:row.createdAt,
        updatedAt:row.updatedAt,topicId:row.topicId});
      }
      cursor.continue();
     }catch(cause){error=cause instanceof MyWriteDraftError?cause:new MyWriteDraftError(storageCode(cause));try{tx.abort();}catch{}}
    };
    tx.oncomplete=()=>{
     if(this.closed){reject(new MyWriteDraftError('MYWRITE_CLOSED'));return;}
     resolve({items,after:hasMore?items[items.length-1].id:null});
    };
    tx.onabort=()=>reject(error||new MyWriteDraftError(storageCode(tx.error)));
   }catch(cause){if(tx)try{tx.abort();}catch{}reject(new MyWriteDraftError(storageCode(cause)));}
  });
 }
 async save(command){
  if(!exact(command,['id','expectedRevision','text','topicId','operationId'])||
     !id(command.id)||!revision(command.expectedRevision)||!content(command.text)||
     !topic(command.topicId)||!id(command.operationId))fail('MYWRITE_INVALID');
  const {id:recordId,expectedRevision,text,topicId,operationId}=command;
  return this.transaction(recordId,'readwrite',(row,store)=>{
   if(row?.lifecycle==='deleted')fail('MYWRITE_DELETED');
   if(row?.lastWriteId===operationId){
    if(row.baseRevision===expectedRevision&&row.text===text&&row.topicId===topicId)return row;
    fail('MYWRITE_CONFLICT');
   }
   if((row?.revision||0)!==expectedRevision)fail('MYWRITE_CONFLICT');
   if(expectedRevision>=Number.MAX_SAFE_INTEGER-1)fail('MYWRITE_LIMIT');
   const now=this.clock();if(!time(now))fail('MYWRITE_INVALID_TIME');
   const next={format:FORMAT,id:recordId,revision:expectedRevision+1,
    createdAt:row?.createdAt??now,updatedAt:Math.max(now,row?.updatedAt??now),
    text,topicId,lifecycle:'draft',lastWriteId:operationId,baseRevision:expectedRevision};
   store.put(next);return next;
  });
 }
 async remove(command){
  if(!exact(command,['id','expectedRevision','operationId'])||!id(command.id)||
     !revision(command.expectedRevision)||command.expectedRevision<1||!id(command.operationId))fail('MYWRITE_INVALID');
  const {id:recordId,expectedRevision,operationId}=command;
  return this.transaction(recordId,'readwrite',(row,store)=>{
   if(!row)fail('MYWRITE_CONFLICT');
   if(row.lifecycle==='deleted'){
    if(row.lastWriteId===operationId&&row.baseRevision===expectedRevision)return row;
    fail('MYWRITE_DELETED');
   }
   if(row.revision!==expectedRevision||row.lastWriteId===operationId)fail('MYWRITE_CONFLICT');
   if(expectedRevision>=Number.MAX_SAFE_INTEGER-1)fail('MYWRITE_LIMIT');
   const now=this.clock();if(!time(now))fail('MYWRITE_INVALID_TIME');
   const next={...row,revision:expectedRevision+1,updatedAt:Math.max(now,row.updatedAt),
    text:null,topicId:null,lifecycle:'deleted',lastWriteId:operationId,baseRevision:expectedRevision};
   store.put(next);return next;
  });
 }
 async review(recordId,expectedRevision){
  if(!revision(expectedRevision)||expectedRevision<1)fail('MYWRITE_INVALID');
  const row=await this.read(recordId);
  if(!row||row.revision!==expectedRevision)fail('MYWRITE_CONFLICT');
  if(row.lifecycle==='deleted')fail('MYWRITE_DELETED');
  // Ephemeral explicit-review handoff only. No automatic domain commit.
  return Object.freeze({id:row.id,revision:row.revision,createdAt:row.createdAt,
   updatedAt:row.updatedAt,text:row.text,topicId:row.topicId,authorRole:'human',origin:'mywrite'});
 }
}
