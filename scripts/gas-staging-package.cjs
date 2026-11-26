'use strict';
// No external writes. Clasp snapshots are private; only inventory/digests are logged.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const policy=require('../contracts/gas-staging-sync.json');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const sorted=x=>[...x].sort();
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
function fail(m){throw Error(m);}
function same(a,b,m){if(JSON.stringify(stable(a))!==JSON.stringify(stable(b)))fail(m);}
function readDir(dir,remote=false){
 const out=new Map();
 for(const f of fs.readdirSync(dir,{withFileTypes:true})){
  if(remote&&f.name==='.clasp.json'&&f.isFile())continue;
  if(!f.isFile()||!(f.name==='appsscript.json'||/\.(gs|js)$/.test(f.name)))fail('UNMAPPED_ENTRY: '+f.name);
  out.set(f.name,fs.readFileSync(path.join(dir,f.name),'utf8'));
 }
 return out;
}
function digest(files){return hash(JSON.stringify(sorted(files.keys()).map(n=>[n,hash(files.get(n))])));}
function names(files){return sorted(files.keys());}
function globals(files,parse){
 const result=new Map();
 function add(id,file){if(!id)return;if(result.has(id))fail('DUPLICATE_GLOBAL: '+id);result.set(id,file);}
 function pattern(p,file){
  if(p.type==='Identifier')add(p.name,file);
  else if(p.type==='RestElement')pattern(p.argument,file);
  else if(p.type==='AssignmentPattern')pattern(p.left,file);
  else if(p.type==='ArrayPattern')p.elements.filter(Boolean).forEach(x=>pattern(x,file));
  else if(p.type==='ObjectPattern')p.properties.forEach(x=>pattern(x.type==='RestElement'?x.argument:x.value,file));
  else fail('UNSUPPORTED_BINDING: '+file);
 }
 for(const [file,src] of files){
  if(file==='appsscript.json')continue;
  try{new vm.Script(src,{filename:file});}catch{fail('SYNTAX_ERROR: '+file);}
  let ast;try{ast=parse(src,{ecmaVersion:'latest',sourceType:'script'});}catch{fail('AST_ERROR: '+file);}
  // Top-level lexical bindings and all program-scope var bindings (also
  // inside top-level blocks). Do not count nested function-local names.
  function walk(n,top=false){
   if(!n||typeof n!=='object')return;
   if(n.type==='FunctionDeclaration'||n.type==='ClassDeclaration'){
    if(!top&&n.type==='FunctionDeclaration')fail('BLOCK_FUNCTION_REVIEW_REQUIRED: '+file);
    if(top)add(n.id.name,file);
    return;
   }
   if(['FunctionExpression','ArrowFunctionExpression','ClassExpression'].includes(n.type))return;
   if(n.type==='VariableDeclaration'){
    if(top||n.kind==='var')n.declarations.forEach(d=>pattern(d.id,file));
    return;
   }
   for(const v of Object.values(n)){
    if(Array.isArray(v))v.forEach(x=>{if(x&&typeof x.type==='string')walk(x);});
    else if(v&&typeof v.type==='string')walk(v);
   }
  }
  ast.body.forEach(n=>walk(n,true));
 }
 // Also detects cross-file lexical declaration collisions.
 try{new vm.Script([...files].filter(([n])=>n!=='appsscript.json').map(([,v])=>v).join('\n;\n'));}catch{fail('COMBINED_SYNTAX_ERROR');}
 return result;
}
function endpoint(repo=root){
 const get=f=>{const m=fs.readFileSync(path.join(repo,f),'utf8').match(/apiUrl:\s*'(https:\/\/script\.google\.com\/macros\/s\/([A-Za-z0-9_-]+)\/exec)'/);if(!m)fail('ENDPOINT_INVALID');return {url:m[1],id:m[2]};};
 const a=get('staging/config.js'),b=get('config.js');
 if(a.id===b.id)fail('PRODUCTION_TARGET');
 return a;
}
function build(repoFiles,remote,parse,p=policy){
 same(names(repoFiles),sorted([...Object.keys(p.managed),'appsscript.json']),'REPO_INVENTORY_DRIFT');
 if(p.visual.length!==13||new Set(p.visual).size!==13||p.visual.some(n=>!p.managed[n]||!/^Visual\w+\.gs$/.test(n)))fail('VISUAL_INVENTORY');
 const managed=Object.values(p.managed);
 if(new Set(managed).size!==managed.length||managed.includes(p.legacyBundle))fail('MAPPING_COLLISION');
 const common=managed.filter(n=>!p.visual.some(v=>p.managed[v]===n));
 const old=sorted([...common,p.legacyBundle,...p.preserve,'appsscript.json']);
 const next=sorted([...managed,...p.preserve,'appsscript.json']);
 const actual=names(remote);
 if(JSON.stringify(actual)!==JSON.stringify(old)&&JSON.stringify(actual)!==JSON.stringify(next)){
  fail('REMOTE_INVENTORY_DRIFT: missing='+old.filter(n=>!remote.has(n)).join(',')+'; unmapped='+actual.filter(n=>!old.includes(n)&&!next.includes(n)).join(','));
 }
 let manifest,rManifest;
 try{manifest=JSON.parse(repoFiles.get('appsscript.json'));rManifest=JSON.parse(remote.get('appsscript.json'));}catch{fail('MANIFEST_JSON_INVALID');}
 same(manifest,rManifest,'MANIFEST_DRIFT');
 if(manifest.runtimeVersion!=='V8'||manifest.timeZone!=='Asia/Jakarta'||manifest.exceptionLogging!=='STACKDRIVER'||manifest.webapp?.executeAs!=='USER_DEPLOYING'||manifest.webapp?.access!=='ANYONE_ANONYMOUS')fail('MANIFEST_POLICY');
 same(sorted(manifest.oauthScopes||[]),sorted([
  'https://www.googleapis.com/auth/spreadsheets','https://www.googleapis.com/auth/script.scriptapp',
  'https://www.googleapis.com/auth/script.external_request','https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/drive'
 ]),'MANIFEST_SCOPE_POLICY');
 const candidate=new Map([['appsscript.json',repoFiles.get('appsscript.json')]]);
 for(const [from,to] of Object.entries(p.managed))candidate.set(to,repoFiles.get(from));
 for(const n of p.preserve)candidate.set(n,remote.get(n));
 if(candidate.has(p.legacyBundle)||candidate.size!==next.length)fail('PACKAGE_INVENTORY');
 const before=globals(remote,parse),after=globals(candidate,parse);
 const visualTargets=new Set(p.visual.map(n=>p.managed[n]));
 for(const [n,file] of before){
  if(!after.has(n))fail('UNMAPPED_GLOBAL: '+n+' in '+file);
  if(file===p.legacyBundle?!visualTargets.has(after.get(n)):after.get(n)!==file)
   fail('UNMAPPED_GLOBAL_OWNER: '+n+' in '+file);
 }
 for(const n of p.preserve)if(candidate.get(n)!==remote.get(n))fail('PRESERVE_DRIFT');
 return {candidate,before,after,baselineDigest:digest(remote),candidateDigest:digest(candidate),changed:names(candidate).filter(n=>candidate.get(n)!==remote.get(n)),removed:names(remote).filter(n=>!candidate.has(n))};
}
// One-time license-only release profile. Keep existing v34 bundle and every
// other editor file byte-for-byte; do not promote unrelated module changes.
// Full modular build remains available as a separate reviewed plan.
function buildRelease(repoFiles,remote,parse,p=policy){
 const profile=p.releaseProfile;
 if(!profile)return build(repoFiles,remote,parse,p);
 if(profile.mode!=='studio-license-only-v34'||p.initialVersion!==34||!/^[a-f0-9]{64}$/.test(profile.baselineDigest||''))fail('RELEASE_PROFILE_INVALID');
 if(digest(remote)!==profile.baselineDigest)fail('LICENSE_BASELINE_DRIFT');
 if(remote.size!==28||!remote.has(p.legacyBundle)||p.managed['Code.gs']!=='Kode.js')fail('LICENSE_BASELINE_INVENTORY');
 // Apply the original structural/manifest checks as well; no broad output is used.
 const full=build(repoFiles,remote,parse,p);
 const candidate=new Map(remote);
 candidate.set('Kode.js',repoFiles.get('Code.gs'));
 const before=full.before,after=globals(candidate,parse);
 const allowed=['ngdStudioGuard_','ngdStudioAllowed_','ngdStudioToken_','ngdStudioKey_','ngdStudioHash_','ngdStudioRead_','ngdStudioParent_','ngdStudioIssue_','ngdStudioExchange_','ngdStudioValidate_','ngdStudioLogout_','ngdStudioAdminList_','ngdStudioAdminSet_','ngdStudioRoute_'].sort();
 for(const [name,file] of before)if(after.get(name)!==file)fail('LICENSE_EXISTING_GLOBAL_DRIFT: '+name);
 same(sorted([...after.keys()].filter(n=>!before.has(n))),allowed,'LICENSE_NEW_GLOBAL_INVENTORY');
 for(const name of allowed)if(after.get(name)!=='Kode.js')fail('LICENSE_GLOBAL_OWNER');
 // Exact AST inventory for pre-existing Kode.js top-level statements. Only
 // the reviewed NGD revision, STAGING identity and gateway may differ.
 const nodes=src=>parse(src,{ecmaVersion:'latest',sourceType:'script'}).body;
 const norm=n=>JSON.stringify(n,(k,v)=>['start','end','loc','range','raw'].includes(k)?undefined:typeof v==='bigint'?String(v)+'n':v);
 const old=nodes(remote.get('Kode.js')),fresh=nodes(candidate.get('Kode.js'));
 const isNew=n=>n.type==='FunctionDeclaration'&&allowed.includes(n.id?.name);
 const isReviewed=n=>n.type==='FunctionDeclaration'&&['ngdStagingWorkspaceInfo_','doPost'].includes(n.id?.name)||n.type==='VariableDeclaration'&&n.declarations.length===1&&n.declarations[0].id?.name==='NGD';
 const filtered=fresh.filter(n=>!isNew(n));
 if(old.length!==filtered.length)fail('LICENSE_CODE_STATEMENT_DRIFT');
 let changes=0;
 for(let i=0;i<old.length;i++){
  if(norm(old[i])===norm(filtered[i]))continue;
  if(!isReviewed(old[i])||!isReviewed(filtered[i]))fail('LICENSE_UNRELATED_CODE_CHANGE');
  changes++;
 }
 if(changes!==3)fail('LICENSE_EXPECTED_CODE_DELTA');
 const changed=names(candidate).filter(n=>candidate.get(n)!==remote.get(n));
 same(changed,['Kode.js'],'LICENSE_PACKAGE_DELTA');
 return {candidate,before,after,baselineDigest:digest(remote),candidateDigest:digest(candidate),changed,removed:[],releaseProfile:profile.mode};
}
function authorize(r,version,p=policy){
 const a=p.approval;
 if(a.status!=='APPROVED'||typeof a.reviewReference!=='string'||!a.reviewReference.trim())fail('GEMINI_RECONCILIATION_PENDING');
 if(a.triggerAuditComplete!==true||a.sideEffectsReviewed!==true)fail('TRIGGER_OR_SIDE_EFFECT_REVIEW_PENDING');
 if(!Number.isSafeInteger(version)||version<1||!(/^[a-f0-9]{64}$/.test(a.baselineDigest||'')&&/^[a-f0-9]{64}$/.test(a.candidateDigest||''))||a.baselineVersion!==version||a.baselineDigest!==r.baselineDigest||a.candidateDigest!==r.candidateDigest)fail('REVIEWED_DIGEST_OR_VERSION_MISMATCH');
 if(!Array.isArray(a.triggerHandlers)||new Set(a.triggerHandlers).size!==a.triggerHandlers.length||a.triggerHandlers.some(n=>typeof n!=='string'||!r.after.has(n)))fail('UNMAPPED_TRIGGER');
}
function writePackage(dir,files){fs.mkdirSync(dir,{mode:0o700});for(const [n,s] of files){if(path.basename(n)!==n||!/^(?:[A-Za-z0-9_.$-]+\.js|appsscript\.json)$/.test(n))fail('UNSAFE_PACKAGE_NAME');fs.writeFileSync(path.join(dir,n),s,{mode:0o600,flag:'wx'});}}
module.exports={root,policy,readDir,digest,globals,build,buildRelease,authorize,writePackage,endpoint,names};
if(require.main===module){
 try{
  const [remote,versionDir,out]=process.argv.slice(2);
  if(!remote||!versionDir||!out)fail('Usage: node scripts/gas-staging-package.cjs <editor snapshot> <deployed snapshot> <new package dir>');
  const parse=require('acorn').parse;
  const actual=readDir(remote,true),deployed=readDir(versionDir,true);
  const r=buildRelease(readDir(path.join(root,'apps-script')),actual,parse);
  writePackage(out,r.candidate);
  console.log(JSON.stringify({editorFiles:actual.size,versionMatchesEditor:digest(actual)===digest(deployed),candidateFiles:r.candidate.size,globalCount:r.after.size,changed:r.changed,removed:r.removed,baselineDigest:r.baselineDigest,candidateDigest:r.candidateDigest,releaseGate:policy.approval.status}));
  console.log('NGD_STAGING_AUDIT_COMPLETE_NO_REMOTE_WRITE');
 }catch(e){console.error('STOP: '+e.message);process.exitCode=1;}
}
