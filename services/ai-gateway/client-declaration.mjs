import {createHash} from 'node:crypto';
import {requestBindingHash} from './signed-identity.mjs';
import {clientDeclarationData,clientDeclarationCanonical} from '../../extension/core/ai-usage/client-declaration.js';

// Authentication and publication belong to the server publisher, not this codec.
export function snapshotClientDeclaration(request,value){
 try{const d=clientDeclarationData(value);if(d.requestHash!==requestBindingHash(request)||d.consentEpoch!==request.consentEpoch)throw Error();return d;}
 catch{throw Object.assign(new Error('DECLARATION_INVALID'),{code:'DECLARATION_INVALID'});}
}
export const clientDeclarationHash=value=>createHash('sha256').update(clientDeclarationCanonical(value),'utf8').digest('hex');
