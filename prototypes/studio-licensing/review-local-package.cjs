'use strict';
// Local, read-only AST evidence. Never execute GAS, print source/literals, or write remote.
// This is a static triage, not a proof that side effects are absent.
const path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const p=require('../../scripts/gas-staging-package.cjs');
const BASE='3dabc17e8c2db1d439bf47b1f6d73425c36b7ccc';
const BASELINE='99b88cf002f89f1509370f8d2864c90ff3d5543238a84f38c19b0780780f3a5e';
const MAIN='5285bca94c17582f12f889826333d7670cca86fa95668d4971b096dbefc48f58';
const CANDIDATE='ed9fabc9bc24c72f524897beaed31857b2d076f17520fe9b450d96431e1b157d';
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function canonical(node){
 return JSON.stringify(node,(key,value)=>['start','end','loc','range','raw'].includes(key)?undefined:typeof value==='bigint'?String(value)+'n':value);
}
const ast=(s,parse)=>parse(s,{ecmaVersion:'latest',sourceType:'script'}).body;
function summarize(a,b,parse){
 const aa=ast(a,parse),bb=ast(b,parse);
 const af=aa.map(n=>hash(canonical(n))),bf=bb.map(n=>hash(canonical(n)));
 const ordered=JSON.stringify(af)===JSON.stringify(bf);
 const multiset=JSON.stringify([...af].sort())===JSON.stringify([...bf].sort());
 const name=n=>n.type==='FunctionDeclaration'||n.type==='ClassDeclaration'?n.id?.name||n.type:n.type;
 const remaining=(left,right)=>{const counts=new Map();for(const v of right)counts.set(v,(counts.get(v)||0)+1);return left.map((v,i)=>{const c=counts.get(v)||0;if(c){counts.set(v,c-1);return -1;}return i;}).filter(i=>i>=0);};
 return {ast_order_equal:ordered,ast_multiset_equal:multiset,removed_or_changed:remaining(af,bf).map(i=>name(aa[i])),added_or_changed:remaining(bf,af).map(i=>name(bb[i]))};
}
// Explicit method-name inventory. No literals, call arguments, URLs or values.
// "top level" excludes deferred function/class bodies; callbacks invoked by
// top-level calls are not proven inert. Indirect calls may escape this scan.
const effects=new Set(['fetch','fetchAll','sendEmail','send','sendMessage','setProperty','setProperties','deleteProperty','deleteAllProperties','setValue','setValues','setFormula','setFormulas','appendRow','deleteRow','deleteRows','insertRow','insertRows','clear','clearContent','clearContents','createFile','createFolder','setContent','setTrashed','newTrigger','deleteTrigger','create','put','remove','removeAll','setSharing','addEditor','removeEditor','updateRow_','appendRow_','logAudit_','updateSetting_','notify_','grantInitialCredit_','ngderSendWhatsApp_']);
function inventory(source,parse){
 const all=new Set(),top=new Set();
 function walk(n,deferred=false){
  if(!n||typeof n!=='object')return;
  if(['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression','ClassDeclaration','ClassExpression'].includes(n.type))deferred=true;
  if(n.type==='CallExpression'||n.type==='NewExpression'){
   const c=n.callee;
   const name=c?.type==='Identifier'?c.name:c?.type==='MemberExpression'&&!c.computed?c.property?.name:c?.type==='MemberExpression'&&c.computed&&typeof c.property?.value==='string'?c.property.value:null;
   if(effects.has(name)){all.add(name);if(!deferred)top.add(name);}
  }
  for(const v of Object.values(n)){
   if(Array.isArray(v))for(const x of v)walk(x,deferred);
   else if(v&&typeof v==='object')walk(v,deferred);
  }
 }
 ast(source,parse).forEach(n=>walk(n));
 return {effect_names:[...all].sort(),top_level_effect_names:[...top].sort()};
}
function main(){
 const snapshot=process.argv[2];assert.ok(snapshot,'SNAPSHOT_REQUIRED');
 const parse=require('acorn').parse,remote=p.readDir(snapshot,true),files=p.readDir(path.join(p.root,'apps-script'));
 assert.equal(p.digest(remote),BASELINE,'BASELINE_MISMATCH');
 const result=p.build(files,remote,parse);
 assert.equal(result.candidateDigest,CANDIDATE,'CANDIDATE_MISMATCH');
 const mainFiles=new Map(files);
 mainFiles.set('Code.gs',cp.execFileSync('git',['show',BASE+':apps-script/Code.gs'],{cwd:p.root,encoding:'utf8',maxBuffer:8*1024*1024}));
 const m=p.build(mainFiles,remote,parse);assert.equal(m.candidateDigest,MAIN,'MAIN_MISMATCH');
 const managed=[];
 for(const [from,to] of Object.entries(p.policy.managed)){
  if(p.policy.visual.includes(from))continue;
  if(remote.get(to)!==m.candidate.get(to))managed.push({file:to,...summarize(remote.get(to),m.candidate.get(to),parse)});
 }
 const visual=summarize(remote.get(p.policy.legacyBundle),p.policy.visual.map(n=>m.candidate.get(p.policy.managed[n])).join('\n;\n'),parse);
 // Separators insert empty statements only; compare again without artificial separators.
 const visualJoined=summarize(remote.get(p.policy.legacyBundle),p.policy.visual.map(n=>m.candidate.get(p.policy.managed[n])).join('\n'),parse);
 const preserved=p.policy.preserve.map(file=>({file,...inventory(remote.get(file),parse)}));
 console.log(JSON.stringify({status:'LOCAL_AST_REVIEW_COMPLETE',baseline:result.baselineDigest,candidate:result.candidateDigest,manifest_semantic_equal:true,managed,visual_bundle:visualJoined,visual_with_separators:visual.ast_order_equal,preserved,license_delta:summarize(m.candidate.get('Kode.js'),result.candidate.get('Kode.js'),parse),limitations:'Static AST comparison and selected effect-name inventory only; no runtime or complete call-graph proof. No remote writes.'},null,2));
}
module.exports={summarize,inventory};
if(require.main===module){try{main();}catch(e){console.error('LOCAL_AST_REVIEW_STOP: '+(e.code==='ERR_ASSERTION'?'assertion failed (check exact snapshots and fingerprints)':e.message?.split('\n')[0]?.slice(0,100)||'unknown'));process.exitCode=1;}}
