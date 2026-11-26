// Official portal UI only. Never persist or place a grant in a URL.
export function studioPilotVisible({config,workspace,pathname,member,token,qa,connected,writable}){
 return config===true&&connected===true&&writable===true&&qa===false&&typeof pathname==="string"&&pathname.includes("/staging/")&&workspace?.workspace==="NGD_STAGING"&&workspace.environment==="STAGING"&&workspace.mutations_enabled===true&&member?.role==="MEMBER"&&member.status==="AKTIF"&&/^[a-fA-F0-9]{64}$/.test(token||"");
}
export function createGrantController({issue,isCurrent,onState,now=Date.now,schedule=setTimeout,cancel=clearTimeout}){
 let alive=true,busy=false,timer=null,grant=null;
 const clear=()=>{if(timer!==null)cancel(timer);timer=null;grant=null;};
 async function request(){
  if(!alive||busy||grant||!isCurrent())return false;
  busy=true;onState({phase:"pending"});
  try{
   const start=now(),r=await issue();
   if(!alive||!isCurrent())return false;
   if(typeof r?.code!=="string"||!/^[a-f0-9]{64}$/.test(r.code)||r.expires_in!==180||now()>=start+180000)throw Error("GRANT_INVALID");
   grant={code:r.code,deadline:start+180000};
   timer=schedule(()=>{clear();if(alive&&isCurrent())onState({phase:"expired"});},grant.deadline-now());
   onState({phase:"ready",code:grant.code});return true;
  }catch{if(alive&&isCurrent())onState({phase:"error"});return false;}
  finally{busy=false;}
 }
 function dismiss(){clear();if(alive&&isCurrent())onState({phase:"idle"});}
 function dispose(){alive=false;clear();}
 return Object.freeze({request,dismiss,dispose});
}
export function mountStudioGrantCard({root,issue,isCurrent}){
 const doc=root.ownerDocument,el=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
 const card=el("section");card.className="surface";card.setAttribute("aria-label","Akses Linggau AI Studio");
 const heading=el("h3","Linggau AI Studio"),intro=el("p","Ambil kode masuk untuk workspace Studio. Khusus member pilot yang diizinkan.");
 const button=el("button","Buat kode akses");button.type="button";button.className="btn btn-primary";
 const label=el("label","Kode masuk (berlaku maksimal 3 menit)"),field=el("input");field.type="text";field.readOnly=true;field.autocomplete="off";field.spellcheck=false;field.setAttribute("aria-label","Kode masuk Studio");
 const select=el("button","Pilih kode untuk disalin");select.type="button";select.className="btn btn-secondary";
 const dismiss=el("button","Sembunyikan kode");dismiss.type="button";dismiss.className="btn btn-ghost";
 const status=el("p");status.setAttribute("role","status");
 const controls=el("div");controls.hidden=true;controls.append(label,field,select,dismiss);
 card.append(heading,intro,button,controls,status);root.prepend(card);
 const controller=createGrantController({issue,isCurrent,onState:s=>{
  const ready=s.phase==="ready";field.value=ready?s.code:"";controls.hidden=!ready;button.disabled=ready||s.phase==="pending";
  status.textContent={idle:"",pending:"Meminta kode…",ready:"Salin kode ke Canvas resmi. Jangan bagikan kepada orang lain.",expired:"Kode kedaluwarsa. Buat kode baru.",error:"Kode tidak dapat dibuat. Periksa hak akses atau coba kembali."}[s.phase]||"";
 }});
 button.addEventListener("click",()=>void controller.request());select.addEventListener("click",()=>{if(isCurrent()){field.focus();field.select();}});dismiss.addEventListener("click",controller.dismiss);
 const hide=()=>{controller.dispose();field.value="";card.remove();};
 return {unmount:hide};
}
