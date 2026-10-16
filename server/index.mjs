import http from "node:http";
import {readFile,writeFile,rename,mkdir,stat} from "node:fs/promises";
import {randomBytes,scryptSync,timingSafeEqual,createHash} from "node:crypto";
import {dirname,resolve,extname,join} from "node:path";
import {fileURLToPath} from "node:url";
import {newSession,availableActions,dispatch,replay,ROLES} from "../engine/core.mjs";
const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,"..");
const dataFile=resolve(process.env.COURT_DATA_PATH||join(here,"data","store.json"));
const host=process.env.HOST||"127.0.0.1",port=Number(process.env.PORT||8787);
const cookieName="court_session";
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8"};
let data={users:[],cases:[],tokens:[]},queue=Promise.resolve();
function problem(code,message){return Object.assign(new Error(message),{code});}
function hashPassword(password,salt){return scryptSync(password,salt,64).toString("hex");}
function checkPassword(password,user){const a=Buffer.from(hashPassword(password,user.salt),"hex"),b=Buffer.from(user.passwordHash,"hex");return a.length===b.length&&timingSafeEqual(a,b);}
const tokenHash=t=>createHash("sha256").update(t).digest("hex");
function findAuth(req){
 const token=(req.headers.cookie||"").split(";").map(s=>s.trim()).find(s=>s.startsWith(cookieName+"="))?.slice(cookieName.length+1);
 if(!token||!/^[-_a-f0-9]{48,128}$/i.test(token))return null;
 const record=data.tokens.find(t=>t.hash===tokenHash(token)&&t.expires>Date.now());
 return record?data.users.find(u=>u.id===record.userId):null;
}
async function load(){
 try{const obj=JSON.parse(await readFile(dataFile,"utf8"));if(!Array.isArray(obj.users)||!Array.isArray(obj.cases)||!Array.isArray(obj.tokens))throw Error("Invalid storage");data=obj;}
 catch(e){if(e.code!=="ENOENT")throw e;}
}
async function persist(){
 await mkdir(dirname(dataFile),{recursive:true});
 const tmp=dataFile+"."+process.pid+".tmp";
 await writeFile(tmp,JSON.stringify(data),{mode:0o600});
 await rename(tmp,dataFile);
}
function transaction(fn){const run=queue.then(async()=>{const snapshot=structuredClone(data);try{const result=await fn();await persist();return result;}catch(e){data=snapshot;throw e;}});queue=run.catch(()=>{});return run;}
function send(res,status,payload,headers={}){res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...headers});res.end(JSON.stringify(payload));}
async function readJson(req){
 let raw="";for await(const chunk of req){raw+=chunk;if(raw.length>32768)throw problem(413,"Request too large");}
 try{return JSON.parse(raw||"{}");}catch{throw problem(400,"Invalid JSON");}
}
const clean=s=>typeof s==="string"?s.trim():"";
const cookies=token=>`${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${process.env.COOKIE_SECURE==="1"?"; Secure":""}`;
async function api(req,res,path){
 const method=req.method||"GET";
 if(!["GET","POST"].includes(method))return send(res,405,{error:"Method not allowed"});
 if(method==="POST"){
  const origin=req.headers.origin;
  if(origin){const target=new URL(req.url,"http://localhost");const current=`${req.headers["x-forwarded-proto"]||"http"}://${req.headers.host}`;if(origin!==current)throw problem(403,"Cross-origin requests forbidden");}
  if(!String(req.headers["content-type"]||"").startsWith("application/json"))throw problem(415,"JSON required");
 }
 if(path==="/api/register"&&method==="POST"){
  const body=await readJson(req),email=clean(body.email).toLowerCase(),password=body.password;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>150||typeof password!=="string"||password.length<12||password.length>200)throw problem(400,"Valid email and password of 12–200 characters required");
  const user=await transaction(()=>{if(data.users.some(x=>x.email===email))throw problem(409,"Account already exists");const salt=randomBytes(16).toString("hex");const u={id:randomBytes(16).toString("hex"),email,salt,passwordHash:hashPassword(password,salt)};data.users.push(u);return u;});
  return send(res,201,{user:{id:user.id,email:user.email}});
 }
 if(path==="/api/login"&&method==="POST"){
  const body=await readJson(req),email=clean(body.email).toLowerCase();
  const user=data.users.find(x=>x.email===email);
  if(!user||typeof body.password!=="string"||!checkPassword(body.password,user))throw problem(401,"Invalid credentials");
  const token=randomBytes(32).toString("hex");
  await transaction(()=>{data.tokens.push({hash:tokenHash(token),userId:user.id,expires:Date.now()+86400000});});
  return send(res,200,{user:{id:user.id,email:user.email}},{"Set-Cookie":cookies(token)});
 }
 const user=findAuth(req);
 if(!user)throw problem(401,"Sign in required");
 if(path==="/api/logout"&&method==="POST"){
  const token=(req.headers.cookie||"").split(";").map(s=>s.trim()).find(s=>s.startsWith(cookieName+"="))?.split("=")[1];
  await transaction(()=>{data.tokens=data.tokens.filter(t=>t.hash!==tokenHash(token||""));});
  return send(res,200,{ok:true},{"Set-Cookie":`${cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`});
 }
 if(path==="/api/me"&&method==="GET")return send(res,200,{user:{id:user.id,email:user.email}});
 if(path==="/api/cases"&&method==="GET")return send(res,200,{cases:data.cases.filter(c=>c.ownerId===user.id).map(c=>({id:c.id,role:c.session.role,stage:c.session.stage,completed:c.session.completed}))});
 if(path==="/api/cases"&&method==="POST"){
  const body=await readJson(req),role=body.role||"defendant";
  if(!ROLES.includes(role))throw problem(400,"Invalid role");
  const item=await transaction(()=>{const id=randomBytes(16).toString("hex");const row={id,ownerId:user.id,session:newSession({sessionId:id,role})};data.cases.push(row);return row;});
  return send(res,201,{case:item.session});
 }
 const match=path.match(/^\/api\/cases\/([a-f0-9]{32})(?:\/actions)?$/);
 if(!match)throw problem(404,"Not found");
 const row=data.cases.find(c=>c.id===match[1]&&c.ownerId===user.id);
 if(!row)throw problem(404,"Case not found");
 if(method==="GET"&&path.endsWith(match[1]))return send(res,200,{case:row.session,actions:availableActions(row.session)});
 if(method==="POST"&&path.endsWith("/actions")){
  const command=await readJson(req);
  const result=await transaction(()=>{
   // Re-locate inside transaction to prevent using a stale row reference.
   const target=data.cases.find(c=>c.id===match[1]&&c.ownerId===user.id);
   const verified=replay({sessionId:target.session.sessionId,role:target.session.role,scenarioId:target.session.scenarioId,events:target.session.events});
   if(verified.stage!==target.session.stage||verified.completed!==target.session.completed)throw problem(409,"Case history mismatch");
   const next=dispatch(verified,command);target.session=next.session;return next;
  });
  return send(res,200,{case:result.session,event:result.event,replayed:result.replayed,actions:availableActions(result.session)});
 }
 throw problem(405,"Method not allowed");
}
export function createServer(){
 return http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url||"/","http://localhost");
   if(url.pathname.startsWith("/api/"))return await api(req,res,url.pathname);
   if(req.method!=="GET")return send(res,405,{error:"Method not allowed"});
   const asset=url.pathname==="/"?"prototype/index.html":url.pathname==="/workspace"?"server/client.html":url.pathname==="/server/client.js"?"server/client.js":url.pathname.startsWith("/prototype/")?url.pathname.slice(1):url.pathname==="/engine/core.mjs"?"engine/core.mjs":null;
   if(!asset||asset.includes("..")||![".html",".js",".css",".mjs"].includes(extname(asset)))return send(res,404,{error:"Not found"});
   const content=await readFile(resolve(root,asset));
   res.writeHead(200,{"Content-Type":mime[extname(asset)]||"text/javascript; charset=utf-8","X-Content-Type-Options":"nosniff","Cache-Control":"no-cache"});res.end(content);
  }catch(e){const status=e.code==="ENOENT"?404:Number.isInteger(e.code)?e.code:e.code==="FORBIDDEN"?403:e.code==="SESSION_CLOSED"||e.code==="IDEMPOTENCY_CONFLICT"?409:400;send(res,status,{error:e.message});}
 });
}
export async function start(){await load();const server=createServer();await new Promise(done=>server.listen(port,host,done));return server;}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){start().then(()=>console.log(`Court simulator listening on http://${host}:${port}`)).catch(e=>{console.error(e);process.exitCode=1;});}
