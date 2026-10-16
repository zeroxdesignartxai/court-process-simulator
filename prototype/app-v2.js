import {STAGES,ROLES,newSession,availableActions,dispatch,replay} from "../engine/core.mjs";

const STORAGE_KEY="court-simulator-v2";
const EXHIBITS={
  A:"Exhibit A • Fictional service agreement: Contractor agrees to repair three fixtures; payment is due after satisfactory completion.",
  B:"Exhibit B • Fictional invoice: $2,400 billed. The invoice alone does not prove performance."
};
const DESCRIPTIONS={
  intake:"Identify the parties and disputed issue in this fictional contract case.",
  pleadings:"Record the positions. Allegations are not established facts.",
  evidence:"Mark a fictional exhibit for discussion. Marking is not admission or a legal ruling.",
  hearing:"Practice a question, testimony, or recordkeeping. No evidence objection is adjudicated.",
  conclusion:"Reflect on the evidence, uncertainty, and fairness of the exercise.",
  closed:"Training session complete. Export or reset to start again."
};
const LABELS={
 IDENTIFY_ISSUES:"Identify the disputed issue",
 RECORD_POSITIONS:"Record the parties' positions",
 MARK_EXHIBIT:"Mark an exhibit for discussion",
 ASK_QUESTION:"Ask a hearing question",
 ANSWER_QUESTION:"Give limited witness testimony",
 RECORD_HEARING:"Record hearing notes",
 SUMMARIZE_LEARNING:"Summarize what you learned"
};
const PROMPTS={
 IDENTIFY_ISSUES:"What facts are disputed?",
 RECORD_POSITIONS:"What are the competing positions?",
 ASK_QUESTION:"What question would you ask?",
 ANSWER_QUESTION:"What did you personally observe?",
 RECORD_HEARING:"What happened during this hearing?",
 SUMMARIZE_LEARNING:"What evidence is missing, and what did you learn?"
};
const $=id=>document.getElementById(id);
function createSession(role="defendant"){return newSession({sessionId:"practice-v2",role});}
function recover(){
 try{
  const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
  if(!saved||saved.schemaVersion!==2||!ROLES.includes(saved.role))return createSession();
  const reconstructed=replay({sessionId:saved.sessionId,role:saved.role,scenarioId:saved.scenarioId,events:saved.events});
  if(reconstructed.stage!==saved.stage||reconstructed.completed!==saved.completed)throw Error("State mismatch");
  return reconstructed;
 }catch{return createSession();}
}
let session=recover();
function persist(){
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify(session));return true}
 catch{return false}
}
function exportJson(){
 const blob=new Blob([JSON.stringify({trainingNotice:"Fictional educational exercise, not legal advice",...session},null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="court-practice-v2.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function displayStage(stage){return stage.replaceAll("_"," ").replace(/^./,c=>c.toUpperCase());}
function inputFor(kind){
 const wrapper=document.createElement("div");wrapper.className="practice-action";
 const label=document.createElement("label");label.textContent=LABELS[kind];label.className="action-label";
 let input;
 if(kind==="MARK_EXHIBIT"){
  input=document.createElement("select");
  input.innerHTML='<option value="A">Exhibit A: Agreement</option><option value="B">Exhibit B: Invoice</option>';
 }else{
  input=document.createElement("textarea");input.rows=2;input.maxLength=500;input.required=true;
  input.placeholder=PROMPTS[kind];input.setAttribute("aria-label",LABELS[kind]);
 }
 const button=document.createElement("button");button.className="action";button.type="button";button.textContent="Submit: "+LABELS[kind];
 button.onclick=()=>{
  const value=input.value.trim();
  if(!value){$("feedback").textContent="Enter your practice response.";input.focus();return;}
  const payload=kind==="MARK_EXHIBIT"?{exhibitId:value}:kind==="ASK_QUESTION"||kind==="ANSWER_QUESTION"?{statement:value}:kind==="SUMMARIZE_LEARNING"?{reflection:value}:{note:value};
  try{
   const result=dispatch(session,{kind,payload,idempotencyKey:"step-"+(session.events.length+1)});
   session=result.session;const saved=persist();render();
   $("feedback").textContent=(result.replayed?"Already recorded. ":"Recorded fictional training action. ")+(saved?"":"Browser storage unavailable; export your record before leaving.");
  }catch(e){$("feedback").textContent=e.message;}
 };
 wrapper.append(label,input,button);
 return wrapper;
}
function render(){
 $("role").value=session.role;
 $("stageLabel").textContent=session.completed?"Completed":displayStage(session.stage);
 $("progressLabel").textContent="Stage "+Math.min(STAGES.indexOf(session.stage)+1,5)+" of 5";
 $("actorBadge").textContent=session.role.replaceAll("_"," ");
 $("scene").textContent=DESCRIPTIONS[session.stage];
 $("promptTitle").textContent=session.completed?"Practice completed":"Choose your practice response";
 $("timeline").replaceChildren(...STAGES.filter(s=>s!=="closed").map((stage,i)=>{
  const li=document.createElement("li");li.textContent=displayStage(stage);
  li.className=i===STAGES.indexOf(session.stage)?"current":i<STAGES.indexOf(session.stage)?"done":"";
  return li;
 }));
 $("actions").replaceChildren(...availableActions(session).map(inputFor));
 $("transcript").replaceChildren(...session.events.map(ev=>{
  const li=document.createElement("li"),strong=document.createElement("strong");
  strong.textContent=displayStage(ev.stage)+" • "+ev.role.replaceAll("_"," ")+": ";
  li.append(strong,document.createTextNode(LABELS[ev.kind]+": "+Object.values(ev.payload).join(" ")));
  return li;
 }));
}
$("role").addEventListener("change",e=>{session=createSession(e.target.value);persist();render();$("feedback").textContent="New practice session started for this role."});
$("resetBtn").addEventListener("click",()=>{session=createSession(session.role);persist();render();$("feedback").textContent="Session reset."});
$("exportBtn").addEventListener("click",exportJson);
document.querySelectorAll("[data-document]").forEach(button=>{
 button.addEventListener("click",()=>{$("exhibitViewer").textContent=EXHIBITS[button.dataset.document==="contract"?"A":"B"];});
});
render();
