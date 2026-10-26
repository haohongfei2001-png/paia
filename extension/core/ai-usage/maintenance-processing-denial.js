// Additional, irreversible denial only. The original source issuer, selector
// and purpose owners remain the positive authority. No project imports or
// caller-provided callback may enter a terminal facts sweep through this leaf.
const cells=new WeakMap(),raws=new WeakMap();
const descriptor=Object.getOwnPropertyDescriptor,own=Object.hasOwn,keys=Reflect.ownKeys;
const aborted=descriptor(AbortSignal.prototype,'aborted').get;
const wall=Date.now.bind(Date),mono=performance.now.bind(performance);
const deny=()=>{const error=new Error('Maintenance processing unavailable');error.code='UNAVAILABLE';throw error;};
const need=value=>{if(!value)deny();};
const object=value=>value!==null&&(typeof value==='object'||typeof value==='function');
const data=(value,key)=>{need(object(value));const d=descriptor(value,key);need(d&&own(d,'value'));return d.value;};
const fields=['store','repository','database','libraryId','signals','wallDeadline','monoDeadline'];
function options(value){
 need(value&&Object.getPrototypeOf(value)===Object.prototype);
 const names=keys(value);need(names.every(key=>fields.includes(key))&&['store','repository','database'].every(key=>names.includes(key)));
 const out={libraryId:null,signals:[],wallDeadline:null,monoDeadline:null};for(const key of names)out[key]=data(value,key);return out;
}
function signals(value){
 need(Array.isArray(value));const length=data(value,'length'),names=keys(value);
 need(Number.isSafeInteger(length)&&length>=0&&length<=8&&names.length===length+1&&names.every(key=>key==='length'||typeof key==='string'&&/^(0|[1-9][0-9]*)$/.test(key)&&Number(key)<length));
 const out=[];for(let i=0;i<length;i++){const signal=data(value,String(i));need(!out.includes(signal)&&!aborted.call(signal));out.push(signal);}return Object.freeze(out);
}
function current(record){
 try{
  need(!record.retired&&data(record.store,'repository')===record.repository&&data(record.repository,'db')===record.database);
  if(record.libraryId!==null)need(data(record.store,'databaseId')===record.libraryId);
  for(const signal of record.signals)need(!aborted.call(signal));
  const now=wall(),elapsed=mono();
  need(now>=record.firstWall&&elapsed>=record.firstMono&&(record.wallDeadline===null||now<record.wallDeadline)&&(record.monoDeadline===null||elapsed<record.monoDeadline));
  return true;
 }catch(error){record.retired=true;throw error;}
}
export function createMaintenanceProcessingDenyCell(configuration){
 const value=options(configuration),firstWall=wall(),firstMono=mono();
 need(object(value.store)&&object(value.repository)&&object(value.database));
 need(value.libraryId===null||typeof value.libraryId==='string'&&value.libraryId.length>0&&value.libraryId.length<=200);
 need(value.wallDeadline===null||Number.isSafeInteger(value.wallDeadline)&&value.wallDeadline>firstWall);
 need(value.monoDeadline===null||Number.isFinite(value.monoDeadline)&&value.monoDeadline>firstMono);
 const record={...value,signals:signals(value.signals),firstWall,firstMono,retired:false};current(record);
 const cell=Object.freeze(Object.create(null));cells.set(cell,record);return cell;
}
export function retireMaintenanceProcessingDenyCell(cell){const record=cells.get(cell);need(record);record.retired=true;return true;}
export function assertMaintenanceProcessingDenyCellFacts(cell){const record=cells.get(cell);need(record);return current(record);}
export function bindMaintenanceProcessingRawDenials(raw,store,selected,parents=[]){
 need(object(raw)&&object(store)&&!raws.has(raw)&&Array.isArray(selected));
 const length=data(selected,'length'),names=keys(selected);
 need(Number.isSafeInteger(length)&&length>=1&&length<=8&&names.length===length+1&&names.every(key=>key==='length'||typeof key==='string'&&/^(0|[1-9][0-9]*)$/.test(key)&&Number(key)<length));
 const records=[],tokens=[];let repository=null,database=null;
 for(let i=0;i<length;i++){
  const cell=data(selected,String(i)),record=cells.get(cell);need(record&&record.store===store&&!tokens.includes(cell));current(record);
  repository??=record.repository;database??=record.database;need(record.repository===repository&&record.database===database);tokens.push(cell);records.push(record);
 }
 // A bounded original receipt can contribute only its already-bound deny
 // records. This is not positive authority, a callback, a cell reader or a
 // refresh. Copies, foreign-store parents and retired cells are rejected.
 need(Array.isArray(parents));const parentLength=data(parents,'length'),parentNames=keys(parents);
 need(Number.isSafeInteger(parentLength)&&parentLength>=0&&parentLength<=8&&parentNames.length===parentLength+1&&parentNames.every(key=>key==='length'||typeof key==='string'&&/^(0|[1-9][0-9]*)$/.test(key)&&Number(key)<parentLength));
 const seenParents=new Set();for(let i=0;i<parentLength;i++){
  const parent=data(parents,String(i)),held=raws.get(parent);need(parent!==raw&&!seenParents.has(parent)&&held&&held.store===store);seenParents.add(parent);
  for(const record of held.records){current(record);need(record.repository===repository&&record.database===database);if(!records.includes(record)){need(records.length<8);records.push(record);}}
 }
 // Publish this private association once. No exported operation can delete,
 // append to, replace, refresh or reactivate it, including ordinary cleanup.
 raws.set(raw,{store,records:Object.freeze(records)});return true;
}
export function assertMaintenanceProcessingRawDenialFacts(raw,store){
 const record=raws.get(raw);if(!record)return null;need(record.store===store);
 for(const cell of record.records)current(cell);return true;
}
