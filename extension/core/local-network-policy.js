import {ArchiveError} from './constants.js';
export async function assertLocalNetworkAllowed(store){const denied=await store.run(()=>store.repository.transaction(false,async t=>(await t.get('meta','memory:config'))?.localOnly===true,['meta']));if(denied)throw new ArchiveError('MEMORY_EXTERNAL_DISABLED');}
