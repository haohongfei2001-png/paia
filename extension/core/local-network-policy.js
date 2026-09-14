import {ArchiveError} from './constants.js';
export async function assertLocalNetworkAllowed(store){const allowed=await store.run(()=>store.repository.transaction(false,async t=>{const config=await t.get('meta','memory:config');return config?.externalAccess===true&&config?.localOnly!==true;},['meta']));if(!allowed)throw new ArchiveError('MEMORY_EXTERNAL_DISABLED');}
