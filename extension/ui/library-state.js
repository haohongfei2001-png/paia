import {PRODUCT_STATES} from './product-state.js';
export const LIBRARY_STATES=PRODUCT_STATES;
export function libraryState({running=false,pending=0,existing=0,error=null,partial=false,credential=true,budgetLimited=false}={}){
 if(running)return 'updating';if(budgetLimited)return 'budget_limited';if(pending&&!credential)return 'credential_missing';if(partial)return 'partial';if(error)return 'failed';if(!existing&&!pending)return 'empty';if(pending&&existing)return 'stale';return 'ready';
}
