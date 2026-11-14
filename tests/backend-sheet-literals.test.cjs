'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
function harness(){
  const ctx=vm.createContext({console:{log(){},warn(){},error(){}}});
  vm.runInContext(code,ctx,{timeout:10000});
  const rows=[],updates=[];
  const headers=['member_id','nama','saldo_kredit','joined_at'];
  const sheet={
    appendRow(values){rows.push(values);},
    getLastRow(){return rows.length+1;},
    getRange(row,col){
      return {setValue(value){updates.push({row,col,value});}};
    }
  };
  ctx.tbl_=()=>({sheet,headers});
  return {ctx,rows,updates};
}
test('untrusted formula-like text is prefixed with literal escape',()=>{
  const c=harness().ctx;
  for(const payload of ['=IMPORTXML("https://bad.example","x")',
    '+SUM(A1:A5)', '-A1+2','@SUM(A1)','  =HYPERLINK("https://bad.example","click")']){
    const result=vm.runInContext('sheetLiteral_('+JSON.stringify(payload)+')',c);
    assert.equal(result[0],"'");
    assert.equal(result.slice(1),payload);
  }
});
test('safe text, numbers and dates are preserved',()=>{
  const c=harness().ctx;
  assert.equal(vm.runInContext("sheetLiteral_('Bakso Len')",c),'Bakso Len');
  assert.equal(vm.runInContext('sheetLiteral_(-50)',c),-50);
  assert.equal(vm.runInContext("sheetLiteral_('081234')",c),'081234');
});
test('appendRow sanitizes user-supplied cells without changing numeric types',()=>{
  const h=harness();
  vm.runInContext("appendRow_('members',{member_id:'M-1',nama:'=SUM(1,2)',saldo_kredit:10})",h.ctx);
  assert.equal(h.rows[0][0],'M-1');
  assert.equal(h.rows[0][1],"'=SUM(1,2)");
  assert.equal(h.rows[0][2],10);
});
test('updateRow sanitizes every patched string cell',()=>{
  const h=harness();
  h.rows.push(['M-1','Normal',0,'']);
  vm.runInContext("updateRow_('members',2,{nama:'=1+2',saldo_kredit:5})",h.ctx);
  assert.equal(h.updates[0].value,"'=1+2");
  assert.equal(h.updates[1].value,5);
});
test('updateRow does not write when requested column is unknown',()=>{
  const h=harness();
  h.rows.push(['M-1','Normal',0,'']);
  assert.throws(()=>vm.runInContext("updateRow_('members',2,{fake_field:'=1+2'})",h.ctx),/Kolom tidak dikenal/);
  assert.equal(h.updates.length,0);
});
