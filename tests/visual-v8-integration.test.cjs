'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=path=>fs.readFileSync(require('node:path').join(root,path),'utf8');
const visual=['VisualAdapterContract','VisualApi','VisualCompiler','VisualJobs',
 'VisualMedia','VisualProvider','VisualQuality','VisualRuntime','VisualSkills',
 'VisualStore','VisualTemplates','VisualUpload','VisualWorker'];
test('all 13 GAS Visual modules load as V8 JavaScript with no undefined top-level dependency',()=>{
 const ctx=vm.createContext({console});
 for(const name of visual){
  const source=read('apps-script/'+name+'.gs');
  assert.ok(source.length>100,name+' empty');
  const script=new vm.Script(source,{filename:name+'.gs'});
  assert.doesNotThrow(()=>script.runInContext(ctx),name+' missing load-time symbol');
 }
 for(const fn of [
  'ngdVisualApiRoute_','ngdVisualPublicMode_','ngdVisualActiveMachineIds_',
  'ngdVisualRuntime_','ngdVisualJobs_','ngdVisualMediaDrive_',
  'ngdVisualStoreDrive_','ngdVisualProvider_','ngdVisualWorker_',
  'ngdVisualChunkUpload_','ngdVisualMemberTemplates_',
  'ngdFoodMagazineCompile_','ngdVisualContextSkill_',
  'ngdVisualProvisionPilotWalletStaging','ngdVisualPreparePrivateRegistryStaging',
  'ngdVisualWorkerTickStaging','ngdVisualWorkerCleanupStaging'
 ])assert.equal(typeof ctx[fn],'function','Missing runtime symbol '+fn);
});
test('GAS V8 manifest has explicit Drive+Fetch scopes, existing P0 auth and safe Visual-only routes',()=>{
 const manifest=JSON.parse(read('apps-script/appsscript.json'));
 assert.equal(manifest.runtimeVersion,'V8');
 assert.equal(manifest.timeZone,'Asia/Jakarta');
 assert.equal(manifest.webapp.executeAs,'USER_DEPLOYING');
 for(const scope of ['https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/script.external_request'])
  assert.ok(manifest.oauthScopes.includes(scope),'Missing required GAS scope '+scope);
 const code=read('apps-script/Code.gs'),api=read('apps-script/VisualApi.gs');
 assert.match(code,/function session_\(token\)/);
 assert.match(code,/function byId_\(/);
 assert.match(code,/function doPost\(e\)/);
 assert.match(code,/NGD_VISUAL_API_ACTIONS_\.indexOf\(action\)/);
 assert.match(code,/function requireMutationsEnabled_\(/);
 assert.match(code,/function financeEnabled_\(/);
 for(const action of ['visualTemplateList','visualTemplateSave','visualTemplateDelete',
  'visualUploadChunk','visualCreateJob','visualPollJob','visualResult'])
  assert.ok(api.includes("'"+action+"'"),'Missing isolated route '+action);
 assert.ok(!api.includes("'visualSeedWallet'"),'Pilot funding must not be public action');
 assert.ok(!api.includes("'visualStartWorker'"),'Provider worker must be trigger-only');
});
