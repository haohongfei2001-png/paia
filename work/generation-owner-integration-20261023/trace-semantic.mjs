import {ArchiveRepository} from '../../extension/core/idb-repository.js';
const original=ArchiveRepository.prototype.transaction;
ArchiveRepository.prototype.transaction=function(write,fn,stores){return original.call(this,write,async t=>{try{return await fn(t);}catch(error){console.log(JSON.stringify({diagnostic:'original-callback-error',name:error.name,code:error.code??null}));throw error;}},stores);};
