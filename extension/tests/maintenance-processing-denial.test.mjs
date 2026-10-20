import test from 'node:test';
import assert from 'node:assert/strict';
import {createMaintenanceProcessingDenyCell,retireMaintenanceProcessingDenyCell,assertMaintenanceProcessingDenyCellFacts,bindMaintenanceProcessingRawDenials,assertMaintenanceProcessingRawDenialFacts} from '../core/ai-usage/maintenance-processing-denial.js';

const fixture=()=>{const database={},repository={db:database},store={repository,databaseId:'SYNTHETIC-library'},controller=new AbortController();return {database,repository,store,controller,cell:()=>createMaintenanceProcessingDenyCell({store,repository,database,libraryId:store.databaseId,signals:[controller.signal],wallDeadline:Date.now()+30000,monoDeadline:performance.now()+30000})};};
const refused=fn=>assert.throws(fn,error=>error.code==='UNAVAILABLE');

test('only additional facts: original cells bind once and unknown raw stays legacy-unbound',()=>{
 const f=fixture(),cell=f.cell(),raw=Object.freeze({});assert.equal(assertMaintenanceProcessingRawDenialFacts(raw,f.store),null);
 assert.equal(bindMaintenanceProcessingRawDenials(raw,f.store,[cell]),true);assert.equal(assertMaintenanceProcessingRawDenialFacts(raw,f.store),true);
 refused(()=>bindMaintenanceProcessingRawDenials(raw,f.store,[cell]));refused(()=>bindMaintenanceProcessingRawDenials(raw,f.store,[f.cell()]));
 retireMaintenanceProcessingDenyCell(cell);refused(()=>assertMaintenanceProcessingRawDenialFacts(raw,f.store));refused(()=>bindMaintenanceProcessingRawDenials(raw,f.store,[f.cell()]));
});
test('retirement is sticky, callback-free and does not abort the original native signal',()=>{
 const f=fixture(),cell=f.cell();let dispatches=0;f.controller.signal.addEventListener('abort',()=>dispatches++);
 retireMaintenanceProcessingDenyCell(cell);retireMaintenanceProcessingDenyCell(cell);refused(()=>assertMaintenanceProcessingDenyCellFacts(cell));assert.equal(dispatches,0);assert.equal(f.controller.signal.aborted,false);
});
for(const field of ['repository','database','libraryId'])test('observed '+field+' ABA permanently retires the exact cell',()=>{
 const f=fixture(),cell=f.cell();if(field==='repository')f.store.repository={db:f.database};else if(field==='database')f.repository.db={};else f.store.databaseId='SYNTHETIC-other';
 refused(()=>assertMaintenanceProcessingDenyCellFacts(cell));f.store.repository=f.repository;f.repository.db=f.database;f.store.databaseId='SYNTHETIC-library';refused(()=>assertMaintenanceProcessingDenyCellFacts(cell));
 assert.equal(assertMaintenanceProcessingDenyCellFacts(f.cell()),true);
});
test('fixed own-data checks never call a replacement Store getter',()=>{
 const f=fixture(),cell=f.cell();let reads=0;Object.defineProperty(f.store,'repository',{get(){reads++;return f.repository;},configurable:true});
 refused(()=>assertMaintenanceProcessingDenyCellFacts(cell));assert.equal(reads,0);Object.defineProperty(f.store,'repository',{value:f.repository,writable:true,configurable:true});refused(()=>assertMaintenanceProcessingDenyCellFacts(cell));
});
test('native aborted intrinsic cannot be hidden by an own getter',()=>{
 const f=fixture(),cell=f.cell();let reads=0;Object.defineProperty(f.controller.signal,'aborted',{get(){reads++;return false;}});f.controller.abort();refused(()=>assertMaintenanceProcessingDenyCellFacts(cell));assert.equal(reads,0);
});
test('fake/copied cells and a genuine cell in another Store cannot be attached',()=>{
 const f=fixture(),cell=f.cell();for(const fake of [{},{...cell},Object.create(cell)])refused(()=>bindMaintenanceProcessingRawDenials({},f.store,[fake]));refused(()=>bindMaintenanceProcessingRawDenials({},fixture().store,[cell]));
 const raw={};bindMaintenanceProcessingRawDenials(raw,f.store,[cell]);refused(()=>assertMaintenanceProcessingRawDenialFacts(raw,fixture().store));assert.equal(assertMaintenanceProcessingRawDenialFacts({...raw},f.store),null);
});
test('bindings are copied, closed, distinct and bounded without invoking array accessors',()=>{
 const f=fixture(),first=f.cell(),second=f.cell(),cells=[first],raw={};bindMaintenanceProcessingRawDenials(raw,f.store,cells);cells[0]=second;retireMaintenanceProcessingDenyCell(first);refused(()=>assertMaintenanceProcessingRawDenialFacts(raw,f.store));
 for(const invalid of [[],Array.from({length:9},()=>f.cell()),[second,second]])refused(()=>bindMaintenanceProcessingRawDenials({},f.store,invalid));
 let reads=0;const injected=[];Object.defineProperty(injected,'0',{get(){reads++;return second;},enumerable:true});refused(()=>bindMaintenanceProcessingRawDenials({},f.store,injected));assert.equal(reads,0);
});
test('all original cells remain part of the raw terminal sweep',()=>{
 const f=fixture(),first=f.cell(),second=f.cell(),raw={};bindMaintenanceProcessingRawDenials(raw,f.store,[first,second]);retireMaintenanceProcessingDenyCell(second);refused(()=>assertMaintenanceProcessingRawDenialFacts(raw,f.store));assert.equal(assertMaintenanceProcessingDenyCellFacts(first),true);
});
test('no callback/configured clock or arbitrary predicate is admitted',()=>{
 const f=fixture();let calls=0;refused(()=>createMaintenanceProcessingDenyCell({store:f.store,repository:f.repository,database:f.database,current(){calls++;return true;}}));
 const config={store:f.store,repository:f.repository,database:f.database};Object.defineProperty(config,'signals',{get(){calls++;return [];},enumerable:true});refused(()=>createMaintenanceProcessingDenyCell(config));assert.equal(calls,0);
});
test('expired first deadline refuses rather than minting a renewed cell',()=>{
 const f=fixture();refused(()=>createMaintenanceProcessingDenyCell({store:f.store,repository:f.repository,database:f.database,wallDeadline:Date.now()-1}));refused(()=>createMaintenanceProcessingDenyCell({store:f.store,repository:f.repository,database:f.database,monoDeadline:performance.now()-1}));
});
