// Candidate admin component. Server is authoritative; no optimistic permission changes.
const ID=/^M-[0-9]{1,12}$/;
export function studioAdminVisible({flag,workspace,pathname,member,token,qa,connected}){
 return flag===true&&qa===false&&connected===true&&String(pathname||"").includes("/staging/")&&workspace?.workspace==="NGD_STAGING"&&workspace.environment==="STAGING"&&member?.role==="ADMIN"&&member.status==="AKTIF"&&typeof token==="string"&&/^[a-fA-F0-9]{64}$/.test(token);
}
function parseList(r){
 if(r?.limit!==50||!Array.isArray(r.member_ids)||r.member_ids.length>50||r.member_ids.some(id=>typeof id!=="string"||!ID.test(id))||new Set(r.member_ids).size!==r.member_ids.length)throw Error("LIST_INVALID");
 return [...r.member_ids].sort();
}
export function createStudioAdminController({list,set,isCurrent,onState,canWrite}){
 let alive=true,busy=false,ids=null;
 const current=()=>alive&&isCurrent();
 const emit=(phase,message="")=>{if(current())onState({phase,message,ids:ids?.slice()??null});};
 async function load(){
  if(!current()||busy)return false;
  busy=true;ids=null;emit("pending");
  try{const next=parseList(await list());if(!current())return false;ids=next;emit("ready");return true;}
  catch{emit("error","Daftar izin belum dapat dibaca.");return false;}finally{busy=false;}
 }
 async function change(id,enabled){
  if(!current()||busy||!ids||!canWrite()||typeof id!=="string"||!ID.test(id)||typeof enabled!=="boolean")return false;
  const prior=ids.includes(id);if(prior===enabled||enabled&&ids.length>=50)return false;
  busy=true;emit("pending");
  try{
   const r=await set({member_id:id,enabled,expected_enabled:prior});
   if(!current())return false;
   if(r?.member_id!==id||r.enabled!==enabled||typeof r.changed!=="boolean")throw Error("SET_INVALID");
   ids=parseList(await list());if(!current())return false;
   if(ids.includes(id)!==enabled)throw Error("SET_CONFLICT");
   emit("ready","Daftar izin terverifikasi ulang.");return true;
  }catch{ids=null;emit("error","Hasil perubahan belum pasti. Muat ulang daftar sebelum mencoba lagi.");return false;}
  finally{busy=false;}
 }
 return Object.freeze({load,change,dispose(){alive=false;ids=null;}});
}
export function mountStudioAdminCard({root,list,set,isCurrent,canWrite}){
 const doc=root.ownerDocument,el=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
 const card=el("section");card.className="surface";card.setAttribute("aria-label","Lisensi Linggau AI Studio");
 const h=el("h2","Lisensi Linggau AI Studio"),note=el("p","Izin pilot STAGING. Tidak mengubah pembelian atau saldo member.");
 const reload=el("button","Muat daftar izin");reload.type="button";reload.className="btn btn-secondary";
 const label=el("label","ID member aktif"),input=el("input");input.id="studio-admin-member";label.htmlFor=input.id;input.className="input";input.maxLength=14;input.autocomplete="off";input.placeholder="M-0009";
 const grant=el("button","Berikan akses");grant.type="button";grant.className="btn btn-primary";grant.disabled=true;
 const summary=el("p"),rows=el("div"),status=el("p");status.setAttribute("role","status");
 card.append(h,note,reload,label,input,grant,summary,rows,status);root.prepend(card);
 let controller;
 controller=createStudioAdminController({list,set,isCurrent,canWrite,onState:s=>{
  reload.disabled=s.phase==="pending";grant.disabled=s.phase!=="ready"||!canWrite()||s.ids.length>=50;input.disabled=grant.disabled;rows.replaceChildren();
  summary.textContent=s.ids?s.ids.length+" / 50 member diizinkan":"Daftar belum terverifikasi";
  status.textContent=s.message||(s.phase==="pending"?"Memeriksa izin…":"");
  for(const id of s.ids||[]){const row=el("div"),b=el("button","Cabut akses");b.type="button";b.className="btn btn-secondary";b.disabled=s.phase!=="ready"||!canWrite();b.addEventListener("click",()=>{if(isCurrent()&&doc.defaultView.confirm("Cabut akses "+id+"? Sesi Studio lama akan dibatalkan."))void controller.change(id,false);});row.append(el("span",id),b);rows.append(row);}
 }});
 reload.addEventListener("click",()=>void controller.load());
 grant.addEventListener("click",()=>{const id=input.value.trim().toUpperCase();if(!ID.test(id)){status.textContent="Masukkan ID member yang valid.";return;}if(isCurrent()&&doc.defaultView.confirm("Berikan akses pilot untuk "+id+"?"))void controller.change(id,true);});
 return {unmount(){controller.dispose();input.value="";card.remove();}};
}
