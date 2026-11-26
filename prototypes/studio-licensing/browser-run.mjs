import {createServer} from "node:http";
import {readFile,mkdtemp,rm} from "node:fs/promises";
import {spawn} from "node:child_process";
import {tmpdir} from "node:os";
import {resolve} from "node:path";
import {setTimeout as delay} from "node:timers/promises";
const root=process.cwd(),profile=await mkdtemp(resolve(tmpdir(),"ngd-license-"));
const files=new Map([["/fixture.html",["prototypes/studio-licensing/browser.html","text/html"]],["/fixture.mjs",["prototypes/studio-licensing/browser.mjs","text/javascript"]],...["api","studio-grant","studio-admin"].map(n=>["/js/"+n+".js",["js/"+n+".js","text/javascript"]]),["/assets/app.css",["assets/app.css","text/css"]]]);
const server=createServer(async(req,res)=>{const file=files.get(new URL(req.url,"http://localhost").pathname);if(!file){res.writeHead(404).end();return;}try{const body=await readFile(resolve(root,file[0]));res.writeHead(200,{"Content-Type":file[1]});res.end(body);}catch{res.writeHead(500).end();}});
await new Promise(r=>server.listen(0,"127.0.0.1",r));
const origin="http://127.0.0.1:"+server.address().port;
const chrome=spawn(process.env.CHROME_BIN||"google-chrome",["--headless=new","--no-sandbox","--disable-dev-shm-usage","--disable-gpu","--no-first-run","--remote-debugging-port=0","--user-data-dir="+profile,"about:blank"],{stdio:"ignore"});
let ws,err;chrome.on("error",e=>{err=e});
try{
 let port;for(let i=0;i<150;i++){if(err)throw err;if(chrome.exitCode!==null)throw Error("Chrome exited");try{port=(await readFile(resolve(profile,"DevToolsActivePort"),"utf8")).split("\n")[0];break;}catch{await delay(100);}}
 if(!port)throw Error("Chrome unavailable");
 const pages=await(await fetch("http://127.0.0.1:"+port+"/json/list")).json();ws=new WebSocket(pages.find(p=>p.type==="page").webSocketDebuggerUrl);
 await new Promise((r,j)=>{ws.addEventListener("open",r,{once:true});ws.addEventListener("error",j,{once:true});});
 let seq=0;const pending=new Map(),external=[];
 ws.addEventListener("message",e=>{const m=JSON.parse(e.data);if(m.method==="Network.requestWillBeSent"){const u=m.params.request.url;if(/^https?:/.test(u)&&!u.startsWith(origin+"/"))external.push(u);}if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error("CDP "+m.error.code)):p.resolve(m.result);}});
 const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 await cdp("Network.enable");await cdp("Runtime.enable");await cdp("Emulation.setDeviceMetricsOverride",{width:360,height:800,deviceScaleFactor:1,mobile:true});
 await cdp("Page.navigate",{url:origin+"/fixture.html"});
 let result;for(let i=0;i<200;i++){await delay(100);const a=await cdp("Runtime.evaluate",{expression:"window.__licenseBrowser",returnByValue:true});result=a.result?.value;if(result)break;}
 if(external.length)throw Error("UNEXPECTED_EXTERNAL_NETWORK");
 if(!result?.ok)throw Error(result?.detail||"Browser timeout");
 console.log("NGD_STUDIO_PORTAL_BROWSER_PASS: "+result.detail);
}finally{ws?.close();chrome.kill("SIGKILL");server.close();await delay(200);await rm(profile,{recursive:true,force:true}).catch(()=>{});}
