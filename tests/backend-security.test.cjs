'use strict';
// Security tests deliberately prohibit SpreadsheetApp and ScriptApp access.
// No real Google account, database or external network is required.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
function boot(enabled=false){
  let touched=0;
  const forbidden=new Proxy({}, {get(){touched++;throw new Error('UNEXPECTED_GOOGLE_IO');}});
  const context=vm.createContext({
    console:{log(){},warn(){},error(){}},
    PropertiesService:{getScriptProperties(){
      return {getProperty(key){
        assert.equal(key,'NGD_MUTATIONS_ENABLED');
        return enabled?'true':null;
      }};
    }},
    ContentService:{
      MimeType:{JSON:'json'},
      createTextOutput(content){return {
        getContent(){return content;},
        setMimeType(){return this;}
      };}
    },
    Utilities:{formatDate(date){return new Date(date).toISOString().slice(0,19);}},
    SpreadsheetApp:forbidden,
    ScriptApp:forbidden,
    LockService:forbidden,
    CacheService:forbidden
  });
  vm.runInContext(src,context,{timeout:2000});
  function request(action,payload={},token='',id='test_reqid_123456789abcdef'){
    const body=JSON.stringify({action,payload,token,request_id:id});
    return JSON.parse(vm.runInContext('doPost('+JSON.stringify({postData:{contents:body}})+').getContent()',context,{timeout:2000}));
  }
  return {context,request,touched:()=>touched};
}
test('default release flag is disabled and GET advertises writes_enabled false',()=>{
  const s=boot();
  assert.equal(vm.runInContext('mutationsEnabled_()',s.context),false);
  const health=JSON.parse(vm.runInContext('doGet({}).getContent()',s.context));
  assert.equal(health.ok,true);
  assert.equal(health.data.writes_enabled,false);
  assert.equal(s.touched(),0);
});
test('registration, login, order, refund and admin changes fail closed without Sheets',()=>{
  const s=boot();
  for(const action of ['register','login','createOrder','confirmPayment',
    'adminRefundOrder','adminAdjustCredit','adminPromoteWaitlist',
    'adminSuspendMember','adminUpdateSetting','markModulSelesai','generateAI']){
    const result=s.request(action);
    assert.equal(result.ok,false,action);
    assert.equal(result.error.code,'MAINTENANCE',action);
  }
  assert.equal(s.touched(),0);
});
test('manual triggers cannot be installed while release flag is off',()=>{
  const s=boot();
  assert.throws(()=>vm.runInContext('installTriggers()',s.context),/Perubahan data belum diaktifkan/);
  assert.equal(s.touched(),0);
});
test('only exact string true enables mutations',()=>{
  const s=boot(true);
  assert.equal(vm.runInContext('mutationsEnabled_()',s.context),true);
  const health=JSON.parse(vm.runInContext('doGet({}).getContent()',s.context));
  assert.equal(health.data.writes_enabled,true);
  assert.equal(s.touched(),0);
});
