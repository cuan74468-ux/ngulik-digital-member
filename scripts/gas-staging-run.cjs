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
function localHead(){return cp.execFileSync('git',['rev-parse','HEAD'],{cwd:p.root,encoding:'utf8'}).trim();}
function clasp(cwd,args){
 const result=cp.spawnSync(process.env.CLASP_BIN||'clasp',['--json',...args],{cwd,encoding:'utf8',timeout:90000,maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']});
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
async function health(endpoint,files){
 const request=async init=>{
  const r=await fetch(endpoint,{...init,redirect:'follow',signal:AbortSignal.timeout(25000)});
  check(r.ok,'STAGING_HTTP_UNVERIFIED');const j=await r.json();check(j.ok===true&&j.data,'STAGING_RESPONSE_UNVERIFIED');return j.data;
 };
 const info=await request({method:'GET'});
 const identity=await request({method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'getStagingWorkspaceInfo',payload:{},token:'',request_id:crypto.randomUUID().replace(/-/g,'')+'aa'})});
 check(info.app==='Ngulik Digital API'&&identity.workspace==='NGD_STAGING'&&identity.environment==='STAGING'&&identity.admin_login_enabled===true,'STAGING_IDENTITY_UNVERIFIED');
 const keys=['mutations_enabled','registration_enabled','otp_enabled','external_providers_enabled','finance_enabled'];
 check(keys.every(k=>typeof identity[k]==='boolean')&&identity.finance_enabled===false&&info.payments_enabled===false,'STAGING_FINANCE_OR_FLAGS_UNSAFE');
 check(typeof info.writes_enabled==='boolean'&&info.writes_enabled===identity.mutations_enabled,'STAGING_WRITE_FLAG_MISMATCH');
 const marker=files.get('Kode.js')?.match(/SOURCE_REVISION:\s*'([a-z0-9-]{12,80})'/);
 check(marker&&info.source_revision===marker[1],'STAGING_SOURCE_REVISION_UNVERIFIED');
 return JSON.stringify(keys.map(k=>identity[k]));
}
async function run(mode){
 check(['audit','deploy'].includes(mode),'MODE_INVALID');
 check(process.env.GITHUB_REPOSITORY===REPO&&process.env.GITHUB_REF==='refs/heads/main'&&process.env.GITHUB_EVENT_NAME==='workflow_dispatch'&&localHead()===process.env.GITHUB_SHA,'UNTRUSTED_CHECKOUT');
 if(mode==='deploy'){
  check(p.policy.approval.status==='APPROVED','GEMINI_RECONCILIATION_PENDING');
  await ciGate();
 }
 const id=process.env.GAS_STAGING_SCRIPT_ID;
 check(/^[A-Za-z0-9_-]{20,140}$/.test(id||''),'STAGING_SCRIPT_ID_MISSING');
 const ep=p.endpoint(),parse=require('acorn').parse;
 const work=fs.mkdtempSync(path.join(os.tmpdir(),'ngd-gas-sync-'));
 fs.chmodSync(work,0o700);
 try{
  const g=session(work,id,ep.id),head=g.clone(),live=g.deployment(head.dir),backup=g.clone(live.versionNumber);
  const r=p.build(p.readDir(path.join(p.root,'apps-script')),head.files,parse);
  const beforeFlags=await health(ep.url,backup.files);
  console.log(JSON.stringify({version:live.versionNumber,editorFiles:head.files.size,editorEqualsLive:head.digest===backup.digest,candidateFiles:r.candidate.size,changed:r.changed,removed:r.removed,globalCount:r.after.size,baselineDigest:r.baselineDigest,candidateDigest:r.candidateDigest,releaseGate:p.policy.approval.status}));
  if(mode==='audit'){console.log('NGD_STAGING_AUDIT_COMPLETE_NO_REMOTE_WRITE');return;}
  p.authorize(r,live.versionNumber);
  check(head.digest===backup.digest,'EDITOR_DIFFERS_FROM_IMMUTABLE_BACKUP');
  const candidateDir=g.packageDir(r.candidate),restoreDir=g.packageDir(backup.files);
  // The existing immutable deployed version is the recovery source. No new
  // version is necessary before the push when HEAD is exactly identical.
  console.log('RECOVERY_VERSION_READY: '+live.versionNumber);
  await ciGate();
  check(g.clone().digest===head.digest&&g.deployment(head.dir).versionNumber===live.versionNumber,'MANUAL_DRIFT_BEFORE_UPLOAD');
  let newVersion,attempted=false;
  try{
   attempted=true;g.push(candidateDir);
   check(g.clone().digest===r.candidateDigest,'POST_PUSH_EDITOR_MISMATCH');
   newVersion=g.version(candidateDir,process.env.GITHUB_SHA);
   check(g.clone(newVersion).digest===r.candidateDigest,'VERSION_CONTENT_MISMATCH');
   await ciGate();
   check(g.clone().digest===r.candidateDigest&&g.deployment(head.dir).versionNumber===live.versionNumber,'MANUAL_DRIFT_BEFORE_REDEPLOY');
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
    let versionRestored=false,sourceRestored=false;
    try{
     const current=g.deployment(head.dir).versionNumber;
     if(current===newVersion&&newVersion!==undefined)g.redeploy(restoreDir,live.versionNumber,live.description);
     check(g.deployment(head.dir).versionNumber===live.versionNumber,'ROLLBACK_DEPLOYMENT_UNCERTAIN');
     versionRestored=true;
    }catch{console.error('ROLLBACK_DEPLOYMENT_MANUAL_REQUIRED');}
    try{
     const current=g.clone().digest;
     if(current===r.candidateDigest&&current!==head.digest)g.push(restoreDir);
     check(g.clone().digest===head.digest,'ROLLBACK_EDITOR_UNCERTAIN');
     sourceRestored=true;
    }catch{console.error('ROLLBACK_EDITOR_MANUAL_REQUIRED');}
    if(versionRestored&&sourceRestored){
     try{check(await health(ep.url,backup.files)===beforeFlags,'ROLLBACK_FLAGS_UNVERIFIED');console.log('ROLLBACK_BOTH_VERIFIED');}
     catch{console.error('ROLLBACK_ENDPOINT_MANUAL_REQUIRED');}
    }
    console.error('RECOVERY_VERSION: '+live.versionNumber+'; do not blindly retry');
   }
   throw Error('DEPLOY_FAILED');
  }
 }finally{fs.rmSync(work,{recursive:true,force:true});}
}
module.exports={ciGate,required,session};
if(require.main===module)run(process.argv[2]||'audit').catch(e=>{console.error('STOP: '+e.message);process.exitCode=1;});
