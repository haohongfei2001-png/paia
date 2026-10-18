#!/usr/bin/env node
import {readFile} from 'node:fs/promises';
import {NativeContextBridge} from './native-host.mjs';

// An installed, explicitly qualified package specializes only this adjacent
// extension-ID configuration. The source package is deliberately unconfigured.
// Never accept the caller identity, bearer, port or access scope from env/URL.
try{
 const configuration=JSON.parse(await readFile(new URL('./host-configuration.json',import.meta.url),'utf8'));
 if(!configuration||Object.keys(configuration).some(k=>!['version','extensionId'].includes(k))||configuration.version!==1)throw new Error('UNCONFIGURED');
 new NativeContextBridge({input:process.stdin,output:process.stdout,origin:process.argv[2],extensionId:configuration.extensionId});
}catch{process.stderr.write('PAIA Context host unavailable.\n');process.exitCode=1;}
