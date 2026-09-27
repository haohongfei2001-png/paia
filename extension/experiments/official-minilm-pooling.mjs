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
