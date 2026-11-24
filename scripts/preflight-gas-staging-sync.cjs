#!/usr/bin/env node
'use strict';
// STRICT PRE-PUSH AUDIT. Compare a fresh clasp pull of actual GAS editor HEAD
// with main source. Never print remote file bodies, keys or private contents.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const [repoArg,remoteArg]=process.argv.slice(2);
if(!repoArg||!remoteArg)throw Error('Usage: node scripts/preflight-gas-staging-sync.cjs <apps-script> <pulled-remote>');
const repo=path.resolve(repoArg),remote=path.resolve(remoteArg);
function normalize(x){return x.replace(/\r\n/g,'\n').replace(/\n?$/,'\n');}
function sources(dir){
 return new Map(fs.readdirSync(dir,{withFileTypes:true})
  .filter(f=>f.isFile()&&(/\.gs$/.test(f.name)||f.name==='appsscript.json'))
  .map(f=>[f.name,normalize(fs.readFileSync(path.join(dir,f.name),'utf8'))]));
}
const local=sources(repo),actual=sources(remote),errors=[];
if(!local.has('Code.gs')||!actual.has('Code.gs'))errors.push('Code.gs missing');
if(!local.has('Diagnostics.gs')||!actual.has('Diagnostics.gs'))errors.push('Diagnostics.gs missing');
if(!local.has('appsscript.json')||!actual.has('appsscript.json'))errors.push('GAS manifest missing');
const visual=/^Visual[A-Za-z0-9_]*\.gs$/;
for(const name of actual.keys()){
 if(!local.has(name))errors.push('REMOTE-ONLY FILE: '+name+'; destructive push blocked');
}
for(const name of local.keys()){
 if(visual.test(name))continue; // Only Visual source modules may change after the gate.
 if(name==='Code.gs'||name==='appsscript.json')continue;
 if(!actual.has(name))errors.push('LEGACY SOURCE ABSENT ON GAS: '+name);
 else if(actual.get(name)!==local.get(name))
  errors.push('LEGACY SOURCE DRIFT: '+name);
}
const extraStatus={missing_visual:[...local.keys()].filter(n=>visual.test(n)&&!actual.has(n)),
 changed_visual:[...local.keys()].filter(n=>visual.test(n)&&actual.has(n)&&actual.get(n)!==local.get(n))};
const publicLine="    visual_staging_ready:typeof ngdVisualPublicMode_==='function'&&ngdVisualPublicMode_(),\n";
const routerBlock=[
"    // Narrow, independently guarded P1 STAGING Visual API. Every visual*",
"    // request validates session + Visual runtime flags inside VisualApi.gs.",
"    // No payment action or general write flag is modified or bypassed.",
"    if(typeof NGD_VISUAL_API_ACTIONS_!=='undefined'&&",
"       NGD_VISUAL_API_ACTIONS_.indexOf(action)>=0){",
"      require_(/^[a-zA-Z0-9_-]{16,80}$/.test(id),'VALIDATION',",
"        'ID permintaan Visual tidak valid.');",
"      var visualResult=ngdVisualApiRoute_(action,String(body.token||''),payload,id);",
"      return apiOutput_({ok:true,data:visualResult,server_time:isoWib_(now_())});",
"    }"
].join('\n')+'\n';
if(local.has('Code.gs')&&actual.has('Code.gs')){
 const source=local.get('Code.gs');
 if(!source.includes(publicLine)||!source.includes(routerBlock))
  errors.push('Expected isolated Visual router additions missing from GitHub Code.gs');
 else{
  const stripped=source.replace(publicLine,'').replace(routerBlock,'');
  if(actual.get('Code.gs')!==source&&actual.get('Code.gs')!==stripped)
   errors.push('Code.gs GAS editor differs from GitHub P0 baseline: STOP / manual diff and backup required');
 }
}
if(local.has('appsscript.json')&&actual.has('appsscript.json')){
 try{
  const wanted=JSON.parse(local.get('appsscript.json')),running=JSON.parse(actual.get('appsscript.json'));
  const expected=structuredClone(wanted);
  expected.oauthScopes=expected.oauthScopes.filter(x=>x!=='https://www.googleapis.com/auth/drive');
  const sorted=x=>JSON.stringify(x,Object.keys(x).sort()); // deep validation via stable JSON below
  function stable(v){
   if(Array.isArray(v))return v.map(stable);
   if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)]));
   return v;
  }
  const equals=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
  if(!equals(running,wanted)&&!equals(running,expected))
   errors.push('GAS manifest differs beyond additive Drive permission; STOP');
  if(wanted.runtimeVersion!=='V8')errors.push('Target manifest is not V8');
 }catch(_){errors.push('Manifest invalid JSON');}
}
const fingerprint=x=>crypto.createHash('sha256').update(x||'').digest('hex').slice(0,16);
const outcome={
 checkedLegacy:[...local.keys()].filter(n=>!visual.test(n)).length,
 missingVisual:extraStatus.missing_visual,
 changedVisual:extraStatus.changed_visual,
 codeGASHash:fingerprint(actual.get('Code.gs')),
 codeGitHubHash:fingerprint(local.get('Code.gs')),
 errors
};
console.log('GAS_STAGING_PREFLIGHT '+JSON.stringify(outcome));
if(errors.length){console.error('STOP: remote GAS STAGING is NOT proven source-compatible. No push permitted.');process.exit(1)}
console.log('GAS_STAGING_PREFLIGHT_PASS — only isolated Visual additions/updates and Drive scope are eligible.');
