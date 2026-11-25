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
  for(const n of ast.body){
   if(n.type==='FunctionDeclaration'||n.type==='ClassDeclaration')add(n.id.name,file);
   if(n.type==='VariableDeclaration')n.declarations.forEach(d=>pattern(d.id,file));
  }
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
 const manifest=JSON.parse(repoFiles.get('appsscript.json'));
 same(manifest,JSON.parse(remote.get('appsscript.json')),'MANIFEST_DRIFT');
 if(manifest.runtimeVersion!=='V8'||manifest.timeZone!=='Asia/Jakarta'||manifest.webapp?.executeAs!=='USER_DEPLOYING'||manifest.webapp?.access!=='ANYONE_ANONYMOUS')fail('MANIFEST_POLICY');
 const candidate=new Map([['appsscript.json',repoFiles.get('appsscript.json')]]);
 for(const [from,to] of Object.entries(p.managed))candidate.set(to,repoFiles.get(from));
 for(const n of p.preserve)candidate.set(n,remote.get(n));
 if(candidate.has(p.legacyBundle)||candidate.size!==next.length)fail('PACKAGE_INVENTORY');
 const before=globals(remote,parse),after=globals(candidate,parse);
 for(const [n,file] of before)if(!after.has(n))fail('UNMAPPED_GLOBAL: '+n+' in '+file);
 for(const n of p.preserve)if(candidate.get(n)!==remote.get(n))fail('PRESERVE_DRIFT');
 return {candidate,before,after,baselineDigest:digest(remote),candidateDigest:digest(candidate),changed:names(candidate).filter(n=>candidate.get(n)!==remote.get(n)),removed:names(remote).filter(n=>!candidate.has(n))};
}
function authorize(r,version,p=policy){
 const a=p.approval;
 if(a.status!=='APPROVED'||typeof a.reviewReference!=='string'||!a.reviewReference.trim())fail('GEMINI_RECONCILIATION_PENDING');
 if(a.baselineVersion!==version||a.baselineDigest!==r.baselineDigest||a.candidateDigest!==r.candidateDigest)fail('REVIEWED_DIGEST_OR_VERSION_MISMATCH');
 if(!Array.isArray(a.triggerHandlers)||a.triggerHandlers.some(n=>typeof n!=='string'||!r.after.has(n)))fail('UNMAPPED_TRIGGER');
}
function writePackage(dir,files){fs.mkdirSync(dir,{mode:0o700});for(const [n,s] of files)fs.writeFileSync(path.join(dir,n),s,{mode:0o600,flag:'wx'});}
module.exports={root,policy,readDir,digest,globals,build,authorize,writePackage,endpoint,names};
if(require.main===module){
 try{
  const [remote,versionDir,out]=process.argv.slice(2);
  if(!remote||!versionDir||!out)fail('Usage: node scripts/gas-staging-package.cjs <editor snapshot> <deployed snapshot> <new package dir>');
  const parse=require('acorn').parse;
  const actual=readDir(remote,true),deployed=readDir(versionDir,true);
  const r=build(readDir(path.join(root,'apps-script')),actual,parse);
  writePackage(out,r.candidate);
  console.log(JSON.stringify({editorFiles:actual.size,versionMatchesEditor:digest(actual)===digest(deployed),candidateFiles:r.candidate.size,globalCount:r.after.size,changed:r.changed,removed:r.removed,baselineDigest:r.baselineDigest,candidateDigest:r.candidateDigest,releaseGate:policy.approval.status}));
  console.log('NGD_STAGING_AUDIT_COMPLETE_NO_REMOTE_WRITE');
 }catch(e){console.error('STOP: '+e.message);process.exitCode=1;}
}
