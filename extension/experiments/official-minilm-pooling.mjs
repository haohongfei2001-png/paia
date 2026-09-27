// Exact masked mean + L2 normalization for the official MiniLM dense output.
export function meanPoolOfficialDense(output,mask,dimension) {
  const fail=()=>{throw new Error('invalid official dense projection');};
  if(!Number.isInteger(dimension)||dimension<2||dimension>4096
      ||output?.type!=='float32'||!(output.data instanceof Float32Array)
      ||!Array.isArray(output.dims)||output.dims.length!==3
      ||output.dims[0]!==1||output.dims[2]!==dimension
      ||!Number.isInteger(output.dims[1])||output.dims[1]<1||output.dims[1]>512
      ||mask?.type!=='int64'||!(mask.data instanceof BigInt64Array)
      ||!Array.isArray(mask.dims)||mask.dims.length!==2
      ||mask.dims[0]!==1||mask.dims[1]!==output.dims[1]
      ||output.data.length!==output.dims[1]*dimension||mask.data.length!==mask.dims[1])fail();
  const pooled=Array(dimension).fill(0);let count=0;
  for(let token=0;token<mask.data.length;token++){
    const weight=mask.data[token];if(weight!==0n&&weight!==1n)fail();
    if(weight===1n)count++;
    for(let coordinate=0;coordinate<dimension;coordinate++){
      const value=output.data[token*dimension+coordinate];
      if(!Number.isFinite(value))fail();
      if(weight===1n)pooled[coordinate]+=value;
    }
  }
  if(!count)fail();
  for(let coordinate=0;coordinate<dimension;coordinate++)pooled[coordinate]/=count;
  const norm=Math.hypot(...pooled);
  if(!Number.isFinite(norm)||norm<=0)fail();
  return Object.freeze(pooled.map(value=>value/norm));
}


// Fixed booleans only: never serialize names, token IDs, shapes or model output.
export function officialProjectionObservation(inputNames,tokens,dense=null) {
  const known=['input_ids','attention_mask','token_type_ids'];
  const names=Array.isArray(inputNames)?inputNames:[];
  const valid2=t=>t?.type==='int64'&&t.data instanceof BigInt64Array
    &&Array.isArray(t.dims)&&t.dims.length===2&&t.dims[0]===1
    &&Number.isInteger(t.dims[1])&&t.dims[1]>=1&&t.dims[1]<=512
    &&t.data.length===t.dims[1];
  const ids=tokens?.input_ids,mask=tokens?.attention_mask,segments=tokens?.token_type_ids;
  const denseShape=dense?.type==='float32'&&dense.data instanceof Float32Array
    &&Array.isArray(dense.dims)&&dense.dims.length===3&&dense.dims[0]===1
    &&Number.isInteger(dense.dims[1])&&dense.dims[1]>=1&&dense.dims[1]<=512
    &&dense.dims[2]===384&&dense.data.length===dense.dims[1]*384;
  return Object.freeze({
    knownUniqueGraphInputs:names.length>=2&&names.length<=3
      &&new Set(names).size===names.length&&names.every(name=>known.includes(name)),
    graphRequiresInputIds:names.includes('input_ids'),
    graphRequiresAttentionMask:names.includes('attention_mask'),
    graphRequiresTokenTypeIds:names.includes('token_type_ids'),
    inputIdsPresent:ids!=null,inputIdsInt64Shape:valid2(ids),
    attentionMaskPresent:mask!=null,attentionMaskInt64Shape:valid2(mask),
    attentionMaskBinary:valid2(mask)&&mask.data.every(value=>value===0n||value===1n),
    tokenTypeIdsPresent:segments!=null,tokenTypeIdsInt64Shape:valid2(segments),
    inputMaskLengthsMatch:valid2(ids)&&valid2(mask)&&ids.dims[1]===mask.dims[1],
    densePresent:dense!=null,denseFloat32Shape:denseShape,
    denseFinite:denseShape&&dense.data.every(Number.isFinite),
  });
}
