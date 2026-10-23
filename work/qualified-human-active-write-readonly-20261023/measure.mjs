// Read stored JSON evidence only. No database, fixture, checkpoint parser or recovery invocation.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {measureSourceWorkingPhysicalTree as meter} from '../../extension/core/browser-native-sync/source-working-physical.js';
const path=process.argv[2];if(!path?.endsWith('/once/terminal-evidence.json'))throw Error('expected explicit existing terminal evidence');
const raw=fs.readFileSync(path),x=JSON.parse(raw),rows=x.tables.meta.filter(r=>r.id.startsWith('canonical-generation:'));
const groups={};for(const r of rows){const k=r.id.replace(/:[0-9]{8}$/,':N').replace(/receipt:.+$/,'receipt:ID');const g=groups[k]??={rows:0,bytes:0,keyBytes:0};g.rows++;g.bytes+=meter(r).B;g.keyBytes+=meter(r.id).B;}
const sum=rs=>rs.reduce((n,r)=>n+meter(r).B,0),keys=rs=>rs.reduce((n,r)=>n+meter(r.id).B,0);
const copies=rows.filter(r=>/^canonical-generation:checkpoint:(?:state:v1|(?:item|page):[0-9]{8})$/.test(r.id));const retained=rows.filter(r=>!copies.includes(r));
console.log(JSON.stringify({sourceSha256:crypto.createHash('sha256').update(raw).digest('hex'),method:'original pure physical meter on stored terminal JSON; no native execution',rows:rows.length,rowBytes:sum(rows),keyBytes:keys(rows),twoPassBodyOnlyLowerBound:2*sum(rows),keysAdmissionFinalLowerBound:2*sum(rows)+3*keys(rows),ordinaryByteLimit:2097152,copyRows:copies.length,copyBytes:sum(copies),retainedRows:retained.length,retainedBytes:sum(retained),retainedTwoPassLowerBoundExcludingNewRetirementReceipt:2*sum(retained)+3*keys(retained),groups},null,2));
