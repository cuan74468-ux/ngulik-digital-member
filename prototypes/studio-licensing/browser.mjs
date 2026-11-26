import {studioPilotVisible,mountStudioGrantCard} from "/js/studio-grant.js";
import {studioAdminVisible,mountStudioAdminCard} from "/js/studio-admin.js";
const root=document.getElementById("fixture"),assert=(ok,msg)=>{if(!ok)throw Error(msg)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(fn,msg){for(let i=0;i<120;i++){if(fn())return;await sleep(20);}throw Error("timeout "+msg);}
const portal="a".repeat(64),admin="b".repeat(64),code="c".repeat(64),id="M-9001",url="https://script.google.com/macros/s/FIXTURE_ONLY/exec";
window.NGD_CONFIG={apiUrl:url,memberWritesEnabled:true};
const {api}=await import("/js/api.js");
let requests=[],ids=[],current=true,write=true,confirmYes=false,confirmCount=0,ambiguous=false,hold=null,clock=0,expiry=null;
window.confirm=()=>{confirmCount++;return confirmYes;};
window.fetch=async(endpoint,opts)=>{
 assert(endpoint===url&&opts.method==="POST"&&opts.credentials==="omit"&&opts.redirect==="follow","API transport");
 assert(opts.headers["Content-Type"]==="text/plain;charset=utf-8","content type");
 const q=JSON.parse(opts.body);requests.push(q);
 assert(/^[a-zA-Z0-9_-]{16,80}$/.test(q.request_id),"request id");
 let data;
 switch(q.action){
 case "studioIssueGrant":assert(q.token===portal&&Object.keys(q.payload).length===0,"member body");if(hold)await hold;data={code,expires_in:180};break;
 case "studioAdminList":assert(q.token===admin&&Object.keys(q.payload).length===0,"list body");data={member_ids:ids.slice(),limit:50};break;
 case "studioAdminSet":assert(q.token===admin&&Object.keys(q.payload).length===3&&q.payload.member_id===id&&q.payload.expected_enabled===ids.includes(id),"set body");ids=q.payload.enabled?[id]:[];if(ambiguous)throw Error("fixture transport failure");data={member_id:id,enabled:q.payload.enabled,changed:true};break;
 default:throw Error("unexpected action");
 }
 return {ok:true,json:async()=>({ok:true,data})};
};
const button=t=>[...root.querySelectorAll("button")].find(b=>b.textContent===t);
const field=()=>root.querySelector('[aria-label="Kode masuk Studio"]');
const issue=()=>api("studioIssueGrant",{},portal,{write:true});
const mountGrant=()=>mountStudioGrantCard({root,issue,isCurrent:()=>current,now:()=>clock,schedule:(fn,ms)=>{assert(ms===180000,"grant ttl");expiry=fn;return 1;},cancel:()=>{expiry=null;}});
async function run(){
 const member={role:"MEMBER",status:"AKTIF"},workspace={workspace:"NGD_STAGING",environment:"STAGING",mutations_enabled:true};
 const gate={config:true,workspace,pathname:"/staging/member.html",member,token:portal,qa:false,connected:true,writable:true};
 assert(studioPilotVisible(gate),"member eligible");for(const patch of [{config:false},{qa:true},{pathname:"/member.html"},{member:null},{member:{role:"ADMIN",status:"AKTIF"}},{writable:false}])assert(!studioPilotVisible({...gate,...patch}),"member deny");
 const ag={flag:true,workspace,pathname:gate.pathname,member:{role:"ADMIN",status:"AKTIF"},token:admin,qa:false,connected:true};
 assert(studioAdminVisible(ag)&&!studioAdminVisible({...ag,flag:false})&&!studioAdminVisible({...ag,member}),"admin gate");
 assert(root.children.length===0&&requests.length===0,"default no mount");
 let card=mountGrant();button("Buat kode akses").click();await wait(()=>field().value===code,"issue");
 button("Pilih kode untuk disalin").click();assert(field().selectionStart===0&&field().selectionEnd===64,"selection");
 assert(document.documentElement.scrollWidth<=innerWidth+1,"member overflow");
 clock+=180000;expiry();assert(field().value===""&&!button("Buat kode akses").disabled,"expiry");
 button("Buat kode akses").click();await wait(()=>field().value===code,"reissue");button("Sembunyikan kode").click();assert(field().value==="","dismiss local");
 let release;hold=new Promise(r=>{release=r});button("Buat kode akses").click();await wait(()=>button("Buat kode akses").disabled,"pending");card.unmount();current=false;release();await sleep(30);assert(root.children.length===0,"stale render disposed");hold=null;current=true;
 const ac=mountStudioAdminCard({root,list:()=>api("studioAdminList",{},admin),set:p=>api("studioAdminSet",p,admin,{write:true}),isCurrent:()=>current,canWrite:()=>write});
 assert(button("Berikan akses").disabled,"admin initial disabled");button("Muat daftar izin").click();await wait(()=>!button("Berikan akses").disabled,"list loaded");
 const inp=root.querySelector("#studio-admin-member");inp.value=id;button("Berikan akses").click();assert(confirmCount===1&&ids.length===0,"cancelled confirmation");
 confirmYes=true;button("Berikan akses").click();await wait(()=>button("Cabut akses")&&!button("Cabut akses").disabled,"grant confirmed");
 assert(requests.at(-1).action==="studioAdminList"&&ids.includes(id),"grant reread");
 button("Cabut akses").click();await wait(()=>!button("Cabut akses")&&!button("Berikan akses").disabled,"revoke confirmed");assert(ids.length===0&&requests.at(-1).action==="studioAdminList","revoke reread");
 ambiguous=true;button("Berikan akses").click();await wait(()=>root.textContent.includes("Hasil perubahan belum pasti"),"ambiguous error");assert(button("Berikan akses").disabled,"no blind retry");ambiguous=false;
 button("Muat daftar izin").click();await wait(()=>button("Cabut akses")&&!button("Cabut akses").disabled,"reconcile actual state");
 assert(document.documentElement.scrollWidth<=innerWidth+1,"admin overflow");
 write=false;button("Muat daftar izin").click();await wait(()=>button("Cabut akses")&&button("Cabut akses").disabled,"read-only admin");
 ac.unmount();assert(root.children.length===0&&localStorage.length===0&&sessionStorage.length===0&&!location.href.includes(code),"cleanup/no persistence");
 window.__licenseBrowser={ok:true,detail:"360px; member/admin role gates; actual API envelope; issue/select/expiry/dismiss; stale render; confirmation/revoke/reconcile; read-only; no persistence or external requests"};
}
run().catch(e=>window.__licenseBrowser={ok:false,detail:String(e.stack||e)});
