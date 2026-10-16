import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawn} from "node:child_process";
import {createServer} from "node:net";
function port(){return new Promise((resolve,reject)=>{const s=createServer();s.once("error",reject);s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>resolve(p));});});}
async function launch(p,path){
 const child=spawn(process.execPath,["server/index.mjs"],{cwd:new URL("../",import.meta.url).pathname,env:{...process.env,HOST:"127.0.0.1",PORT:String(p),COURT_DATA_PATH:path},stdio:"pipe"});
 for(let i=0;i<80;i++){if(child.exitCode!==null)throw Error("Backend exited");try{const r=await fetch("http://127.0.0.1:"+p+"/workspace");if(r.status===200)return child;}catch{}await new Promise(r=>setTimeout(r,60));}
 child.kill();throw Error("Backend startup failed");
}
async function stop(child){if(!child||child.exitCode!==null)return;child.kill();await new Promise(resolve=>{child.once("exit",resolve);setTimeout(resolve,1500);});}
test("authenticated case actions persist and users are isolated",async()=>{
 const folder=await mkdtemp(join(tmpdir(),"court-api-")),file=join(folder,"store.json"),p=await port(),base="http://127.0.0.1:"+p;
 let child;
 const call=async(path,method="GET",body,cookie="")=>{
  const res=await fetch(base+path,{method,headers:{...(body?{"Content-Type":"application/json"}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});
  return {status:res.status,result:await res.json(),cookie:res.headers.get("set-cookie")?.split(";")[0]};
 };
 try{
  child=await launch(p,file);
  assert.equal((await call("/api/register","POST",{email:"a@example.test",password:"sufficientlylong"})).status,201);
  const a=await call("/api/login","POST",{email:"a@example.test",password:"sufficientlylong"});assert.equal(a.status,200);assert.ok(a.cookie);
  const create=await call("/api/cases","POST",{role:"defendant"},a.cookie);assert.equal(create.status,201);
  const id=create.result.case.sessionId;
  const act=await call("/api/cases/"+id+"/actions","POST",{kind:"IDENTIFY_ISSUES",payload:{note:"Work disputed"},idempotencyKey:"first"},a.cookie);
  assert.equal(act.status,200);assert.equal(act.result.case.stage,"pleadings");
  const replay=await call("/api/cases/"+id+"/actions","POST",{kind:"IDENTIFY_ISSUES",payload:{note:"Work disputed"},idempotencyKey:"first"},a.cookie);assert.equal(replay.result.replayed,true);
  await call("/api/register","POST",{email:"b@example.test",password:"anotherlongpassword"});
  const b=await call("/api/login","POST",{email:"b@example.test",password:"anotherlongpassword"});
  assert.equal((await call("/api/cases/"+id,"GET",undefined,b.cookie)).status,404);
  assert.equal((await call("/api/cases/"+id+"/actions","POST",{kind:"RECORD_POSITIONS",payload:{note:"wrong user"},idempotencyKey:"other"},b.cookie)).status,404);
  assert.equal((await call("/api/cases/"+id,"GET")).status,401);
  await stop(child);child=await launch(p,file);
  assert.equal((await call("/api/cases/"+id,"GET",undefined,a.cookie)).result.case.stage,"pleadings");
  const forbidden=await call("/api/cases/"+id+"/actions","POST",{kind:"ANSWER_QUESTION",payload:{statement:"No"},idempotencyKey:"bad"},a.cookie);assert.equal(forbidden.status,403);
 }finally{await stop(child);await rm(folder,{recursive:true,force:true});}
});
