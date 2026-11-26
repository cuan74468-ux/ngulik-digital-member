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
function clasp(cwd,args){
 const env={...process.env};delete env.GITHUB_TOKEN;delete env.GAS_STAGING_SCRIPT_ID;
 const result=cp.spawnSync(process.env.CLASP_BIN||'clasp',['--json',...args],{cwd,env,encoding:'utf8',timeout:90000,maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']});
 // Never emit raw output or errors: private source and credentials may be present.
 check(!result.error&&result.status===0,'CLASP_FAILED: '+args[0]);
 try{return JSON.parse(result.stdout);}catch{throw Error('CLASP_JSON_UNVERIFIED: '+args[0]);}
}
function session(work,id,deployId){
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
 function push(dir){clasp(dir,['push','--force']);}
 function version(dir,sha){const r=clasp(dir,['create-version','NGD STAGING '+sha]);check(Number.isSafeInteger(r.versionNumber)&&r.versionNumber>0,'VERSION_UNVERIFIED');return r.versionNumber;}
 function redeploy(dir,v,description){
  const r=clasp(dir,['update-deployment',deployId,'--versionNumber',String(v),'--description',description||'NGD STAGING']);
  check(r.deploymentId===deployId&&r.versionNumber===v,'DEPLOYMENT_UPDATE_UNVERIFIED');
 }
 return {clone,deployment,packageDir,push,version,redeploy};
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
   g.push(restoreDir);
  }
  check(g.clone().digest===head.digest,'ROLLBACK_EDITOR_UNCERTAIN');
  outcome.sourceRestored=true;
 }catch{return outcome;}
 try{outcome.healthRestored=await checkHealth()===true;}catch{}
 return outcome;
}
async function run(mode){
 check(['audit','deploy'].includes(mode),'MODE_INVALID');
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
  const g=session(work,id,ep.id),head=g.clone(),live=g.deployment(head.dir),backup=g.clone(live.versionNumber);
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
  if(mode==='audit'){
   if(p.policy.approval.status==='APPROVED')console.log('NGD_STAGING_APPROVED_PACKAGE_AUDIT_PASS');
   console.log('NGD_STAGING_AUDIT_COMPLETE_NO_REMOTE_WRITE');return;
  }
  const candidateDir=g.packageDir(r.candidate),restoreDir=g.packageDir(backup.files);
  // The existing immutable deployed version is the recovery source. No new
  // version is necessary before the push when HEAD is exactly identical.
  console.log('RECOVERY_VERSION_READY: '+live.versionNumber);
  await ciGate();
  check(g.clone().digest===head.digest&&g.deployment(head.dir).versionNumber===live.versionNumber,'MANUAL_DRIFT_BEFORE_UPLOAD');
  check(await health(ep.url,backup.files)===beforeFlags,'STAGING_FLAGS_CHANGED_BEFORE_UPLOAD');
  let newVersion,attempted=false;
  try{
   attempted=true;g.push(candidateDir);
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
module.exports={ciGate,auditGate,required,session,recover,verifyStudioDisabled};
if(require.main===module)run(process.argv[2]||'audit').catch(e=>{console.error('STOP: '+e.message);process.exitCode=1;});
