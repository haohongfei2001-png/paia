// One dependency-free declaration for the original Context bounds.
// Domain modules re-export these exact frozen objects without initializing
// their read/lineage cycles before other source owners can inspect the bounds.
export const CONTEXT_READ_LIMITS=Object.freeze({page:20,scan:20,chunk:8192,outputBytes:256*1024,materialBytes:8*1024*1024,cursors:64,cursorMs:300000,verificationMs:1000,requestMs:10000});
export const CONTEXT_LINEAGE_LIMITS=Object.freeze({topics:8,inputs:16,associations:16,sources:128,readTopics:32,readInputs:256,hashBytes:8*1024*1024});
