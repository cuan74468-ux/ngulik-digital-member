'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const p=require('./gas-staging-package.cjs');
const REPO='cuan74468-ux/ngulik-digital-member';
const required=['validate.yml','staging-source-check.yml','verify-staging-identity.yml'];
function check(v,m){if(!v)throw Error(m);}
async function github(route,env=process.env){
 const r=await fetch('https://api.github.com/repos/'+REPO+route,{headers:{Authorization:'Bearer '+env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(20000)});
 check(r.ok,'GITHUB_API_UNVERIFIED');return r.json();
}
async function ciGate(env=process.env,api=github){
 const sha=env.GITHUB_SHA;
 check(env.GITHUB_REPOSITORY===REPO&&env.GITHUB_REF==='refs/heads/main'&&env.GITHUB_EVENT_NAME==='workflow_dispatch'&&/^[a-f0-9]{40}$/.test(sha||'')&&env.GITHUB_TOKEN,'UNTRUSTED_REF_OR_EVENT');
 check((await api('/git/ref/heads/main',env)).object?.sha===sha,'MAIN_MOVED');
 for(const name of required){
  const d=await api('/actions/workflows/'+name+'/runs?head_sha='+sha+'&branch=main&per_page=100',env);
  const runs=(d.workflow_runs||[]).filter(x=>x.head_sha===sha&&x.head_branch==='main'&&['push','workflow_dispatch'].includes(x.event)).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)||b.id-a.id);
  check(runs.length>0&&runs[0].status==='completed'&&runs[0].conclusion==='success','CI_NOT_GREEN: '+name);
 }
}
// A deployment must cite a completed protected read-only audit on this
// exact main SHA. The separately named successful audit step distinguishes
// audit from deploy; the approved audit path checks fingerprints and flags.
async function auditGate(env=process.env,api=github,now=Date.now()){
 const id=String(env.GAS_FINAL_AUDIT_RUN_ID||'');
 check(/^[1-9][0-9]{0,19}$/.test(id)&&id!==String(env.GITHUB_RUN_ID||''),'FINAL_AUDIT_RUN_ID_REQUIRED');
 const run=await api('/actions/runs/'+id,env);
 check(String(run.id)===id&&String(run.path||'').split('@')[0]==='.github/workflows/gas-staging-sync.yml'&&run.head_sha===env.GITHUB_SHA&&run.head_branch==='main'&&run.event==='workflow_dispatch'&&run.status==='completed'&&run.conclusion==='success','FINAL_AUDIT_RUN_UNVERIFIED');
 const updated=Date.parse(run.updated_at);
 check(Number.isFinite(updated)&&updated<=now+60000&&now-updated<=86400000,'FINAL_AUDIT_STALE');
 const data=await api('/actions/runs/'+id+'/jobs?filter=latest&per_page=100',env);
 check(Array.isArray(data.jobs)&&data.jobs.length===1,'FINAL_AUDIT_JOB_INVENTORY');
 const job=data.jobs[0];
 check(job.name==='staging'&&job.status==='completed'&&job.conclusion==='success'&&Array.isArray(job.steps)&&job.steps.some(s=>s.name==='STAGING audit (protected)'&&s.status==='completed'&&s.conclusion==='success'),'FINAL_AUDIT_MODE_UNVERIFIED');
 console.log('FINAL_AUDIT_GATE_PASS: '+id);
}
function localHead(){return cp.execFileSync('git',['rev-parse','HEAD'],{cwd:p.root,encoding:'utf8'}).trim();}
// Only fixed diagnostic categories may leave the private runner. Never emit
// stderr, stdout on failure, source snippets, paths, request bodies or tokens.
function classifyClaspFailure(result){
 if(result.error?.code==='ETIMEDOUT')return 'TIMEOUT';
 if(result.error)return 'PROCESS_ERROR';
 const message=String(result.stderr||'')+'\n'+String(result.stdout||'');
 const patterns=[
  ['OAUTH_SCOPE',/insufficient authentication scopes|ACCESS_TOKEN_SCOPE_INSUFFICIENT|insufficient scope/i],
  ['AUTH_EXPIRED',/invalid_grant|invalid credentials|not authenticated|unauthenticated|401 unauthorized/i],
  ['PERMISSION_DENIED',/permission.denied|not authorized|forbidden|403|caller does not have permission|insufficient permissions|access denied/i],
  ['API_DISABLED',/API has not been used|API is disabled|accessNotConfigured|SERVICE_DISABLED/i],
  ['SOURCE_SYNTAX',/syntax.?error|unexpected token|illegal character/i],
  ['FILE_CONFLICT',/conflicting files|FILE_CONFLICT|duplicate file/i],
  ['LOCAL_PATH',/security error|escapes project root|symlink|ENOENT/i],
  ['QUOTA',/quota|rate.limit|RESOURCE_EXHAUSTED|too many requests|429/i],
  ['INVALID_ARGUMENT',/invalid argument|INVALID_ARGUMENT|bad request|400/i],
  ['CLI_ARGUMENT',/unknown option|unknown command|too many arguments|missing required argument/i],
  ['NOT_FOUND',/not found|404/i],
  ['TRANSIENT_NETWORK',/ECONNRESET|ETIMEDOUT|ENOTFOUND|503|502|service unavailable/i]
 ];
 return patterns.find(([,re])=>re.test(message))?.[0]||'UNCLASSIFIED';
}
function verifyTrackedInventory(status,files){
 check(status&&Array.isArray(status.filesToPush)&&status.filesToPush.every(n=>typeof n==='string'),'CLASP_STATUS_INVALID');
 const expected=p.names(files);
 const actual=[...status.filesToPush].sort();
 check(JSON.stringify(actual)===JSON.stringify(expected),'CLASP_TRACKED_INVENTORY_MISMATCH');
 return actual.length;
}
// Use the exact installed clasp auth loader (v3.4.1) in the isolated HOME.
// Requests below are GET or OAuth token introspection/refresh only, not GAS writes.
async function loadCredential(){
  delete process.env.DEBUG;delete process.env.NODE_DEBUG;
  const bin=fs.realpathSync(process.env.CLASP_BIN||'');
  check(path.basename(bin)==='index.js','CLASP_AUTH_PATH_INVALID');
  const {pathToFileURL}=require('node:url');
  const {initAuth}=await import(pathToFileURL(path.join(path.dirname(bin),'auth/auth.js')).href);
  const {credentials}=await initAuth({authFilePath:path.join(os.homedir(),'.clasprc.json'),userKey:'default'});
  check(credentials,'CLASP_AUTH_NOT_LOGGED_IN');
  return credentials;
}
async function inspectCredential(scriptId){
 try{
  const credentials=await loadCredential();
  const {token}=await credentials.getAccessToken();
  check(typeof token==='string'&&token.length>0,'CLASP_AUTH_TOKEN_UNAVAILABLE');
  const info=await credentials.getTokenInfo(token);
  const scopes=new Set(info.scopes||[]);
  const projectsWrite=scopes.has('https://www.googleapis.com/auth/script.projects');
  const deploymentsWrite=scopes.has('https://www.googleapis.com/auth/script.deployments');
  console.log(JSON.stringify({diagnostic:'CLASP_OAUTH_SCOPE_CHECK',projects_write:projectsWrite,deployments_write:deploymentsWrite}));
  check(projectsWrite&&deploymentsWrite,'CLASP_WRITE_SCOPE_MISSING');
  const project=(await credentials.request({url:'https://script.googleapis.com/v1/projects/'+encodeURIComponent(scriptId),method:'GET',timeout:20000})).data;
  check(project?.scriptId===scriptId,'CLASP_PROJECT_IDENTITY_UNVERIFIED');
  // Bound project metadata points to its container. Capability is evidence of
  // container edit access, not proof that Apps Script will accept updateContent.
  if(project.parentId){
   let meta;
   try{meta=(await credentials.request({url:'https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(project.parentId),method:'GET',params:{fields:'capabilities(canEdit),ownedByMe',supportsAllDrives:true},timeout:20000})).data;}
   catch(e){console.log(JSON.stringify({diagnostic:'CLASP_CONTAINER_CAPABILITY',can_edit:'UNVERIFIED',category:classifyClaspFailure({stderr:e?.message})}));return credentials;}
   const canEdit=meta?.capabilities?.canEdit;
   console.log(JSON.stringify({diagnostic:'CLASP_CONTAINER_CAPABILITY',can_edit:typeof canEdit==='boolean'?canEdit:'UNVERIFIED',owned_by_credential:meta?.ownedByMe===true}));
   check(canEdit!==false,'CLASP_CONTAINER_EDIT_DENIED');
  }else console.log(JSON.stringify({diagnostic:'CLASP_CONTAINER_CAPABILITY',can_edit:'NOT_BOUND'}));
  return credentials;
 }catch(e){
  // Only our own exact fixed errors may be surfaced, never Google error text.
  const allowed=['CLASP_AUTH_PATH_INVALID','CLASP_AUTH_NOT_LOGGED_IN','CLASP_AUTH_TOKEN_UNAVAILABLE','CLASP_WRITE_SCOPE_MISSING','CLASP_PROJECT_IDENTITY_UNVERIFIED','CLASP_CONTAINER_EDIT_DENIED'];
  throw Error(allowed.includes(e?.message)?e.message:'CLASP_CREDENTIAL_DIAGNOSTIC_FAILED: '+classifyClaspFailure({stderr:e?.message}));
 }
}
// Apps Script updateContent is the same official API called by clasp push.
// Keep the approved full inventory, preserve the remote file order and never
// retry a write automatically. Only bounded status enums leave the runner.
function contentMap(data,id){
 check(data?.scriptId===id&&Array.isArray(data.files),'GAS_CONTENT_IDENTITY_UNVERIFIED');
 const files=new Map();
 for(const f of data.files){
  check(f&&typeof f.name==='string'&&typeof f.source==='string','GAS_CONTENT_FILE_INVALID');
  const n=f.type==='JSON'&&f.name==='appsscript'?'appsscript.json':f.type==='SERVER_JS'&&/^[A-Za-z0-9_.$-]+$/.test(f.name)?f.name+'.js':null;
  check(n&&!files.has(n),'GAS_CONTENT_INVENTORY_INVALID');files.set(n,f.source);
 }
 check(files.size===28&&files.has('appsscript.json'),'GAS_CONTENT_INVENTORY_INVALID');
 return files;
}
function contentPayload(remote,id,files,expectedBefore,expectedAfter){
 const before=contentMap(remote,id);
 check(p.digest(before)===expectedBefore,'GAS_CONTENT_HEAD_DRIFT');
 check(files instanceof Map&&p.digest(files)===expectedAfter,'GAS_CONTENT_PACKAGE_DRIFT');
 check(JSON.stringify(p.names(before))===JSON.stringify(p.names(files)),'GAS_CONTENT_PACKAGE_INVENTORY');
 return {files:remote.files.map(f=>({name:f.name,type:f.type,source:files.get(f.type==='JSON'?'appsscript.json':f.name+'.js')}))};
}
function apiFailure(status,body){
 const allowed=new Set(['INVALID_ARGUMENT','FAILED_PRECONDITION','PERMISSION_DENIED','UNAUTHENTICATED','NOT_FOUND','RESOURCE_EXHAUSTED','UNAVAILABLE','DEADLINE_EXCEEDED','INTERNAL','ABORTED','ALREADY_EXISTS','UNIMPLEMENTED']);
 const http=Number.isInteger(status)&&status>=400&&status<=599?status:0;
 const code=allowed.has(body?.error?.status)?body.error.status:'UNKNOWN';
 const category=classifyClaspFailure({stderr:typeof body?.error?.message==='string'?body.error.message:''});
 return 'GAS_CONTENT_HTTP_'+http+'; status='+code+'; category='+category;
}
async function requestContent(credentials,id,method='GET',payload,transport=fetch){
 check(/^[A-Za-z0-9_-]{20,140}$/.test(id||'')&&['GET','PUT'].includes(method),'GAS_CONTENT_REQUEST_INVALID');
 let token;try{({token}=await credentials.getAccessToken());}catch{throw Error('GAS_CONTENT_AUTH_FAILED');}
 check(typeof token==='string'&&token.length>0,'GAS_CONTENT_AUTH_FAILED');
 let response;
 try{response=await transport('https://script.googleapis.com/v1/projects/'+encodeURIComponent(id)+'/content',{method,headers:{Authorization:'Bearer '+token,Accept:'application/json',...(method==='PUT'?{'Content-Type':'application/json'}:{})},...(method==='PUT'?{body:JSON.stringify(payload)}:{}),redirect:'error',signal:AbortSignal.timeout(60000)});}catch{throw Error('GAS_CONTENT_TRANSPORT_FAILED');}
 let body;try{body=await response.json();}catch{if(!response.ok)throw Error(apiFailure(response.status,null));throw Error('GAS_CONTENT_RESPONSE_INVALID');}
 if(!response.ok)throw Error(apiFailure(response.status,body));
 return body;
}
async function updateContent(credentials,id,files,expectedBefore,expectedAfter,transport=fetch){
 const remote=await requestContent(credentials,id,'GET',undefined,transport);
 const payload=contentPayload(remote,id,files,expectedBefore,expectedAfter);
 const result=await requestContent(credentials,id,'PUT',payload,transport);
 check(p.digest(contentMap(result,id))===expectedAfter,'GAS_CONTENT_RESPONSE_DRIFT');
 console.log('GAS_CONTENT_UPDATE_RESPONSE_VERIFIED');
}
function clasp(cwd,args){
 const env={...process.env};delete env.GITHUB_TOKEN;delete env.GAS_STAGING_SCRIPT_ID;delete env.DEBUG;delete env.NODE_DEBUG;
 const result=cp.spawnSync(process.env.CLASP_BIN||'clasp',['--json',...args],{cwd,env,encoding:'utf8',timeout:90000,maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']});
 // Never emit raw output or errors: private source and credentials may be present.
 if(result.error||result.status!==0)throw Error('CLASP_FAILED: '+args[0]+'; category='+classifyClaspFailure(result));
 try{return JSON.parse(result.stdout);}catch{throw Error('CLASP_JSON_UNVERIFIED: '+args[0]);}
}
function session(work,id,deployId,writeContent){
 let i=0;
 function clone(version){
  const dir=path.join(work,'snapshot-'+(++i));fs.mkdirSync(dir,{mode:0o700});
  const info=clasp(dir,['clone-script',id,...(version==null?[]:[String(version)])]);
  const config=JSON.parse(fs.readFileSync(path.join(dir,'.clasp.json'),'utf8'));
  check(config.scriptId===id&&info.scriptId===id,'SCRIPT_ID_MISMATCH');
  const files=p.readDir(dir,true);
  check(Array.isArray(info.files)&&info.files.length===files.size,'CLONE_INCOMPLETE');
  return {dir,files,digest:p.digest(files)};
 }
 function deployment(dir){
  const all=clasp(dir,['list-deployments']);
  check(Array.isArray(all),'DEPLOYMENT_LIST_INVALID');
  const matches=all.filter(x=>x.deploymentId===deployId);
  check(matches.length===1&&Number.isSafeInteger(matches[0].versionNumber)&&matches[0].versionNumber>0,'STAGING_DEPLOYMENT_NOT_FOUND');
  return matches[0];
 }
 function packageDir(files){
  const dir=path.join(work,'package-'+(++i));p.writePackage(dir,files);
  fs.writeFileSync(path.join(dir,'.clasp.json'),JSON.stringify({scriptId:id,rootDir:'.',scriptExtensions:['.js','.gs']}),{mode:0o600});
  return dir;
 }
 function verifyPackage(dir,files){return verifyTrackedInventory(clasp(dir,['show-file-status']),files);}
 async function push(dir,expectedBefore,expectedAfter){check(typeof writeContent==='function','GAS_CONTENT_WRITER_UNAVAILABLE');await writeContent(p.readDir(dir,true),expectedBefore,expectedAfter);}
 function version(dir,sha){const r=clasp(dir,['create-version','NGD STAGING '+sha]);check(Number.isSafeInteger(r.versionNumber)&&r.versionNumber>0,'VERSION_UNVERIFIED');return r.versionNumber;}
 function redeploy(dir,v,description){
  const r=clasp(dir,['update-deployment',deployId,'--versionNumber',String(v),'--description',description||'NGD STAGING']);
  check(r.deploymentId===deployId&&r.versionNumber===v,'DEPLOYMENT_UPDATE_UNVERIFIED');
 }
 return {clone,deployment,packageDir,verifyPackage,push,version,redeploy};
}
// New Studio-capable source must attest the switch and reject a syntactically
// valid, unissued scoped credential before deployment can be accepted.
// Historical source snapshots did not expose this flag; preserve their health
// contract for baseline and rollback. No token issuance or mutation here.
async function verifyStudioDisabled(files,identity,request){
 const source=files.get('Kode.js')||'';
 if(!/\bfunction\s+ngdStudioGuard_\s*\(/.test(source))return;
 check(identity.studio_pilot_enabled===false,'STAGING_STUDIO_MUST_REMAIN_OFF');
 const denied=await request({method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'studioValidateSession',payload:{},token:crypto.randomBytes(32).toString('hex'),request_id:crypto.randomUUID().replace(/-/g,'')+'aa'})});
 check(denied?.ok===false&&denied.error?.code==='MAINTENANCE','STAGING_STUDIO_DEFAULT_OFF_UNVERIFIED');
}
async function health(endpoint,files){
 const rawRequest=async init=>{
  const r=await fetch(endpoint,{...init,credentials:'omit',redirect:'follow',signal:AbortSignal.timeout(25000)});
  check(r.ok,'STAGING_HTTP_UNVERIFIED');let j;try{j=await r.json();}catch{throw Error('STAGING_NON_JSON_RESPONSE');}return j;
 };
 const request=async init=>{const j=await rawRequest(init);check(j?.ok===true&&j.data,'STAGING_RESPONSE_UNVERIFIED');return j.data;};
 const info=await request({method:'GET'});
 const identity=await request({method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'getStagingWorkspaceInfo',payload:{},token:'',request_id:crypto.randomUUID().replace(/-/g,'')+'aa'})});
 check(info.app==='Ngulik Digital API'&&identity.workspace==='NGD_STAGING'&&identity.environment==='STAGING'&&identity.admin_login_enabled===true,'STAGING_IDENTITY_UNVERIFIED');
 const keys=['mutations_enabled','registration_enabled','otp_enabled','external_providers_enabled','finance_enabled'];
 check(keys.every(k=>typeof identity[k]==='boolean')&&identity.finance_enabled===false&&info.payments_enabled===false,'STAGING_FINANCE_OR_FLAGS_UNSAFE');
 check(typeof info.writes_enabled==='boolean'&&info.writes_enabled===identity.mutations_enabled,'STAGING_WRITE_FLAG_MISMATCH');
 const marker=files.get('Kode.js')?.match(/SOURCE_REVISION:\s*'([a-z0-9-]{12,80})'/);
 check(marker&&info.source_revision===marker[1],'STAGING_SOURCE_REVISION_UNVERIFIED');
 await verifyStudioDisabled(files,identity,rawRequest);
 return JSON.stringify(keys.map(k=>identity[k]));
}

// Recovery is deliberately conservative: never overwrite an unknown version
// or an unknown editor state. A lost runner is an operator recovery incident.
async function recover(g,{head,live,r,newVersion,restoreDir},checkHealth){
 const outcome={versionRestored:false,sourceRestored:false,healthRestored:false};
 try{
  const current=g.deployment(head.dir).versionNumber;
  if(current!==live.versionNumber){
   check(newVersion!==undefined&&current===newVersion,'UNRELATED_DEPLOYMENT');
   g.redeploy(restoreDir,live.versionNumber,live.description);
  }
  check(g.deployment(head.dir).versionNumber===live.versionNumber,'ROLLBACK_DEPLOYMENT_UNCERTAIN');
  outcome.versionRestored=true;
 }catch{return outcome;}
 try{
  const current=g.clone().digest;
  if(current!==head.digest){
   check(current===r.candidateDigest,'UNRELATED_EDITOR_SOURCE');
   // Recheck the known deployment before touching HEAD.
   check(g.deployment(head.dir).versionNumber===live.versionNumber,'ROLLBACK_DEPLOYMENT_MOVED');
   await g.push(restoreDir,r.candidateDigest,head.digest);
  }
  check(g.clone().digest===head.digest,'ROLLBACK_EDITOR_UNCERTAIN');
  outcome.sourceRestored=true;
 }catch{return outcome;}
 try{outcome.healthRestored=await checkHealth()===true;}catch{}
 return outcome;
}
// Read-only attestation for an owner-performed update of the existing deployment.
// Rebuild the approved candidate from immutable v34, not from changed HEAD.
// Only bounded categories and counts; never log private names, hashes or source.
function ownerEditorDiagnostic(actual,baseline,candidate){
 const name='Kode.js',a=actual.get(name),b=baseline.get(name),c=candidate.get(name);
 const normalize=s=>s.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').replace(/\n+$/,'');
 const code=typeof a!=='string'?'MISSING':a===c?'EXACT_CANDIDATE':a===b?'EXACT_BASELINE':typeof c==='string'&&normalize(a)===normalize(c)?'FORMAT_ONLY_CANDIDATE':'CONTENT_DIFFERS';
 const other=xs=>[...xs.keys()].filter(n=>n!==name);
 return {diagnostic:'OWNER_EDITOR_DIFF',code,missing_other:other(candidate).filter(n=>!actual.has(n)).length,extra_other:other(actual).filter(n=>!candidate.has(n)).length,changed_other:other(candidate).filter(n=>actual.has(n)&&actual.get(n)!==candidate.get(n)).length};
}
function ownerAttestation(head,live,baseline,r,active){
 check(baseline.digest===p.policy.approval.baselineDigest,'OWNER_BASELINE_DRIFT');
 check(head.digest===r.candidateDigest,'OWNER_EDITOR_FINGERPRINT_MISMATCH');
 check(Number.isSafeInteger(live.versionNumber)&&live.versionNumber>=p.policy.initialVersion,'OWNER_VERSION_INVALID');
 const deployed=live.versionNumber!==p.policy.initialVersion;
 check(active.digest===(deployed?r.candidateDigest:baseline.digest),'OWNER_LIVE_FINGERPRINT_MISMATCH');
 return deployed?'OWNER_DEPLOY_VERIFIED':'OWNER_EDITOR_VERIFIED';
}
async function run(mode){
 check(['audit','deploy','verify-owner'].includes(mode),'MODE_INVALID');
 check(process.env.GITHUB_REPOSITORY===REPO&&process.env.GITHUB_REF==='refs/heads/main'&&process.env.GITHUB_EVENT_NAME==='workflow_dispatch'&&localHead()===process.env.GITHUB_SHA,'UNTRUSTED_CHECKOUT');
 if(mode==='deploy'){
  check(p.policy.approval.status==='APPROVED','GEMINI_RECONCILIATION_PENDING');
  await ciGate();
  await auditGate();
 }else if(p.policy.approval.status==='APPROVED'){
  await ciGate();
 }
 const id=process.env.GAS_STAGING_SCRIPT_ID;
 check(/^[A-Za-z0-9_-]{20,140}$/.test(id||''),'STAGING_SCRIPT_ID_MISSING');
 const ep=p.endpoint(),parse=require('acorn').parse;
 const work=fs.mkdtempSync(path.join(os.tmpdir(),'ngd-gas-sync-'));
 fs.chmodSync(work,0o700);
 try{
  let credentials;
  const g=session(work,id,ep.id,(files,before,after)=>updateContent(credentials,id,files,before,after)),head=g.clone(),live=g.deployment(head.dir),backup=g.clone(live.versionNumber);
  if(mode==='verify-owner'){
   check(p.policy.releaseProfile?.mode==='studio-license-only-v34','OWNER_RELEASE_PROFILE_INVALID');
   const baseline=g.clone(p.policy.initialVersion);
   const r=p.buildRelease(p.readDir(path.join(p.root,'apps-script')),baseline.files,parse);
   p.authorize(r,p.policy.initialVersion);
   if(head.digest!==r.candidateDigest)console.log(JSON.stringify(ownerEditorDiagnostic(head.files,baseline.files,r.candidate)));
   const status=ownerAttestation(head,live,baseline,r,backup);
   const flags=await health(ep.url,backup.files);
   check(JSON.parse(flags)[0]===false,'STAGING_MUTATIONS_MUST_REMAIN_OFF');
   credentials=await inspectCredential(id);
   const apiHead=contentMap(await requestContent(credentials,id),id);
   check(p.digest(apiHead)===r.candidateDigest,'OWNER_DIRECT_READ_MISMATCH');
   check(g.clone().digest===r.candidateDigest&&g.deployment(head.dir).versionNumber===live.versionNumber,'OWNER_ATTESTATION_DRIFT');
   console.log(status+': '+live.versionNumber+'; 28 files; candidateDigest='+r.candidateDigest);
   console.log('NGD_STAGING_OWNER_ATTESTATION_NO_REMOTE_WRITE');return;
  }
  if(p.policy.releaseProfile)check(live.versionNumber===p.policy.initialVersion,'LICENSE_BASELINE_VERSION_DRIFT');
  const r=p.buildRelease(p.readDir(path.join(p.root,'apps-script')),head.files,parse);
  const beforeFlags=await health(ep.url,backup.files);
  console.log(JSON.stringify({version:live.versionNumber,editorFiles:head.files.size,editorEqualsLive:head.digest===backup.digest,candidateFiles:r.candidate.size,changed:r.changed,removed:r.removed,globalCount:r.after.size,releaseProfile:r.releaseProfile||'full-modular',baselineDigest:r.baselineDigest,candidateDigest:r.candidateDigest,releaseGate:p.policy.approval.status}));
  if(mode==='deploy'||p.policy.approval.status==='APPROVED'){
   p.authorize(r,live.versionNumber);
   check(head.digest===backup.digest,'EDITOR_DIFFERS_FROM_IMMUTABLE_BACKUP');
   // Keep STAGING write gates closed; do not modify any Script Properties.
   check(JSON.parse(beforeFlags)[0]===false,'STAGING_MUTATIONS_MUST_REMAIN_OFF');
  }
  const candidateDir=g.packageDir(r.candidate),restoreDir=g.packageDir(backup.files);
  const candidateCount=g.verifyPackage(candidateDir,r.candidate),restoreCount=g.verifyPackage(restoreDir,backup.files);
  console.log(JSON.stringify({diagnostic:'CLASP_TRACKED_INVENTORY_PASS',candidate_files:candidateCount,rollback_files:restoreCount}));
  credentials=await inspectCredential(id);
  const apiHead=await requestContent(credentials,id);
  contentPayload(apiHead,id,r.candidate,head.digest,r.candidateDigest);
  console.log('GAS_CONTENT_DIRECT_READ_AND_PAYLOAD_PASS');
  if(mode==='audit'){
   if(p.policy.approval.status==='APPROVED')console.log('NGD_STAGING_APPROVED_PACKAGE_AUDIT_PASS');
   console.log('NGD_STAGING_AUDIT_COMPLETE_NO_REMOTE_WRITE');return;
  }
  // The existing immutable deployed version is the recovery source. No new
  // version is necessary before the push when HEAD is exactly identical.
  console.log('RECOVERY_VERSION_READY: '+live.versionNumber);
  await ciGate();
  check(g.clone().digest===head.digest&&g.deployment(head.dir).versionNumber===live.versionNumber,'MANUAL_DRIFT_BEFORE_UPLOAD');
  check(await health(ep.url,backup.files)===beforeFlags,'STAGING_FLAGS_CHANGED_BEFORE_UPLOAD');
  let newVersion,attempted=false;
  try{
   attempted=true;await g.push(candidateDir,head.digest,r.candidateDigest);
   check(g.clone().digest===r.candidateDigest,'POST_PUSH_EDITOR_MISMATCH');
   newVersion=g.version(candidateDir,process.env.GITHUB_SHA);
   check(g.clone(newVersion).digest===r.candidateDigest,'VERSION_CONTENT_MISMATCH');
   await ciGate();
   check(g.clone().digest===r.candidateDigest&&g.deployment(head.dir).versionNumber===live.versionNumber,'MANUAL_DRIFT_BEFORE_REDEPLOY');
   check(await health(ep.url,backup.files)===beforeFlags,'STAGING_FLAGS_CHANGED_BEFORE_REDEPLOY');
   g.redeploy(candidateDir,newVersion,'NGD STAGING '+process.env.GITHUB_SHA);
   check(g.deployment(head.dir).versionNumber===newVersion,'LIVE_VERSION_MISMATCH');
   check(await health(ep.url,r.candidate)===beforeFlags,'STAGING_FLAGS_CHANGED');
   check(g.clone().digest===r.candidateDigest,'POST_DEPLOY_EDITOR_DRIFT');
   console.log('NGD_STAGING_DEPLOY_VERIFIED: '+newVersion);
  }catch(e){
   console.error('DEPLOY_STOP: '+e.message);
   if(attempted){
    // Do not overwrite an unexpected manual change. Treat uncertain state as
    // an incident: recovery version survives loss of runner/local filesystem.
    const outcome=await recover(g,{head,live,r,newVersion,restoreDir},async()=>await health(ep.url,backup.files)===beforeFlags);
    if(!outcome.versionRestored)console.error('ROLLBACK_DEPLOYMENT_MANUAL_REQUIRED');
    if(!outcome.sourceRestored)console.error('ROLLBACK_EDITOR_MANUAL_REQUIRED');
    if(outcome.versionRestored&&outcome.sourceRestored){
     if(outcome.healthRestored)console.log('ROLLBACK_BOTH_VERIFIED');
     else console.error('ROLLBACK_ENDPOINT_MANUAL_REQUIRED');
    }
    console.error('RECOVERY_VERSION: '+live.versionNumber+'; do not blindly retry');
   }
   throw Error('DEPLOY_FAILED');
  }
 }finally{fs.rmSync(work,{recursive:true,force:true});}
}
module.exports={ciGate,auditGate,required,session,recover,verifyStudioDisabled,classifyClaspFailure,verifyTrackedInventory,contentMap,contentPayload,apiFailure,requestContent,updateContent,ownerAttestation,ownerEditorDiagnostic};
if(require.main===module)run(process.argv[2]||'audit').catch(e=>{console.error('STOP: '+e.message);process.exitCode=1;});
