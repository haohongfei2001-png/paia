import {originalLibraryDocumentsConstructor} from './library-documents-owner.js';
export {requireOriginalLibraryDocumentsStore} from './library-documents-owner.js';
// Preserve one public original constructor while the fixed owner avoids a base-class cycle.
export const LibraryDocumentsStore=originalLibraryDocumentsConstructor();
