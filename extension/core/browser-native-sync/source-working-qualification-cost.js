import {measureSourceWorkingPhysicalTree} from './source-working-physical.js';

// Exact original projection numeric tree/canonical tariffs. This pure numeric
// prerequisite grants no read, allocation, capability or budget override. Its
// caller reserves on the SAME original live ticket before the original owners.
const tree=m=>2*m.T+128*m.V+8*m.E+128;
const canonical=m=>tree(m)+16*m.E+2*m.B+128;
export function sourceWorkingScopeScratch(plan){
 const m=measureSourceWorkingPhysicalTree(plan);
 // Selected <=3 groups only (authenticated separately before this call): all
 // cloned member bodies occur inside this complete Plan. Eight tree copies pay
 // member Maps/sort vectors, syncLibrary, both document variants and normalized
 // expected; four COMPLETE-Plan canonical slots pay every family digest peak.
 // Complete family arrays are bounded by the complete Plan, not one operation.
 // Additional8B pays digest bytes/buffers; fixed256Ki pays schema/key/wrappers.
 return 8*tree(m)+4*canonical(m)+8*m.B+256*1024;
}
export function sourceWorkingComparisonScratch(rows,control,expected){
 // Meter the whole physical cut before enumerating it, so supplied accessors
 // and hidden fields refuse before any per-table/member read. A larger corrupt
 // physical operand is priced independently from authentic small operations.
 measureSourceWorkingPhysicalTree(rows);
 let actualPeak=canonical(measureSourceWorkingPhysicalTree(control));
 for(const name of Object.keys(rows))actualPeak=Math.max(actualPeak,canonical(measureSourceWorkingPhysicalTree(rows[name])));
 const m=measureSourceWorkingPhysicalTree(expected);
 // Original equality works one table/row/control at a time. Two complete actual
 // table/control slots cover actual-derived operands plus metadata wrappers
 // formed from actual values. Four independent complete expected slots cover
 // original derived formation, expected wrappers and simultaneous two-side
 // canonical comparison; tree/byte slots pay builders and exact delta strings.
 // This scratch is ADDITIONAL to compiler scratch, never retained tree credit.
 return 2*actualPeak+4*tree(m)+4*canonical(m)+4*m.B+64*1024;
}
