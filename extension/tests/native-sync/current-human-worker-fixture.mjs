// Test-only conversion of fixed module loads; original complete case bodies stay intact.
// MV3 disallows import(), so each exact module is statically imported once.
export function currentHumanWorkerFixture(source,kind){
 const functions={scope:'runCurrentScopeCheckpointNativeCases',recovery:'runCurrentHumanCheckpointRecoveryNativeCases'};
 const name=functions[kind];if(!name||!source.includes('export async function '+name+'(){\n'))throw Error('Unknown fixed native fixture');
 const seams=[...source.matchAll(/await import\('([^']+)'\)/g)];
 if(seams.length!==(kind==='scope'?17:9))throw Error('Original fixed imports changed');
 const owners=new Map();for(const [,path]of seams){if(!path.startsWith('../../core/')||path.slice('../../core/'.length).split('/').some(part=>part==='..'||part==='.'||!part))throw Error('Unexpected fixed fixture import');if(!owners.has(path))owners.set(path,'__currentHumanFixedOwner'+owners.size);}
 const imports=[...owners].map(([path,alias])=>'import * as '+alias+' from '+JSON.stringify(path.replace('../../core/','../core/'))+';').join('\n');
 const body=source.replace(/await import\('([^']+)'\)/g,(_,path)=>'await Promise.resolve('+owners.get(path)+')');if(/\bimport\s*\(/.test(body))throw Error('Unconverted dynamic fixture import');
 return imports+'\n'+body+'\nconst originalNativeRun=globalThis.__bnsNative.run;\nglobalThis.__bnsNative.run=(command,args)=>command==='+JSON.stringify('current-human-worker-'+kind)+'?'+name+'():originalNativeRun(command,args);\n';
}
