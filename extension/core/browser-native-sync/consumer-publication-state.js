import {fail} from './value.js';

// Local publication reservation, deliberately outside the active dataset/Core
// namespace. A namespace switch cannot hide unresolved Chrome-local visibility.
// No reader may treat a present, malformed or foreign reservation as settled.
export const CONSUMER_PUBLICATION_PENDING_ID='bns:consumer-preference-publication:pending';
export async function requireConsumerPublicationSettled(t){
 // Exact-key lookup returns at most one key and never clones the stored value.
 // Visibility cannot be inferred from a receipt, an ACK or process memory.
 if((await t.keys('meta',null,CONSUMER_PUBLICATION_PENDING_ID)).length)fail('BNS_CONSUMER_PUBLICATION_PENDING');
}
