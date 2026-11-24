'use strict';
// Read-only public API probe. Never accepts credentials, tokens or member identifiers.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const configs=[
 ['production','config.js',/apiUrl:\s*'([^']+)'/],
 ['staging','staging/config.js',/apiUrl:\s*'([^']+)'/]
];
async function read(name,url,action){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),22000);
 try{
  const res=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
   body:JSON.stringify({action,payload:{},token:'',request_id:'ngdpubliccmsprobe20261124a1'}),
   redirect:'follow',signal:controller.signal});
  const body=await res.text();
  let json=null;
  try{json=JSON.parse(body)}catch{}
  const data=json?.data;
  const info={name,action,http:res.status,ok:json?.ok===true,
   error_code:String(json?.error?.code||'').slice(0,50),
   data_type:Array.isArray(data)?'array':typeof data,
   count:Array.isArray(data)?data.length:null,
   published_hero:Array.isArray(data)?data.filter(x=>x?.content_id==='CNT-HERO-MAIN').length:null,
   settings_keys:(data&&!Array.isArray(data)&&typeof data==='object')?
     Object.keys(data).filter(x=>/^(nama_brand|tagline_brand|footer_identitas|footer_aksesibilitas)$/.test(x)):[],
   non_json:!json,
   response_bytes:body.length
  };
  console.log('READ_ONLY_CMS_PROBE '+JSON.stringify(info));
  return info;
 }finally{clearTimeout(timer);}
}
(async()=>{
 for(const [name,path,re] of configs){
  const file=fs.readFileSync(path,'utf8'),url=file.match(re)?.[1];
  assert.ok(url&&/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url));
  for(const action of ['getPublicInfo','getPublicContent','getPublicSettings'])
   await read(name,url,action);
 }
})().catch(e=>{console.error('CMS_API_DIAGNOSTIC_FAILED: '+String(e.message));process.exitCode=1});
