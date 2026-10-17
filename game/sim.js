const steps=[
 {name:"Opening",question:"How do you begin the hearing?",speech:"The court calls Rivera versus Parkside Services. This is a fictional training case. What should happen first?",choices:[
 ["Identify both parties and the issue in dispute",2,2,"The record identifies the participants and clarifies the disputed contract performance."],
 ["Demand a ruling immediately",0,-1,"No one has had a fair opportunity to present the case."],
 ["Assume the invoice proves the case",0,0,"An invoice is a claim for payment, not independent proof that contractual obligations were fulfilled."]]},
 {name:"Pleadings",question:"The plaintiff claims $2,400. What matters?",speech:"Plaintiff: We completed the work and have not been paid. Defendant: The work was not completed properly.",choices:[
 ["Separate each allegation from the evidence needed to establish it",2,2,"You identified the legal-fact questions without pretending that allegations are proven."],
 ["Ignore the defendant's response",0,-2,"Ignoring an opposing position undermines a fair hearing."],
 ["Treat the invoice as a final judgment",0,0,"A document does not become a judicial decision merely because it contains a monetary amount."]]},
 {name:"Evidence",question:"How should the invoice be handled?",speech:"Plaintiff offers a $2,400 invoice. Defendant questions whether the work described was completed.",choices:[
 ["Mark the exhibit, then examine authenticity and relevance",3,2,"The document is identified for discussion; evidentiary admission is a distinct question."],
 ["Conclude payment is due from the amount printed",0,0,"The invoice alone does not resolve the underlying performance dispute."],
 ["Hide the document from the other side",-1,-3,"Withholding materials in a fictional hearing obstructs informed response and fair process."]]},
 {name:"Witness",question:"What question best tests the disputed work?",speech:"Witness: I visited the property after the contractor left. I observed one fixture still leaking.",choices:[
 ["Ask what the witness personally saw and when",3,2,"This question seeks first-hand observations and context."],
 ["Ask the witness to guess the contractor's intent",0,0,"Speculation about another person's intent may not establish the disputed facts."],
 ["Tell the witness what answer to give",-1,-2,"Coaching an answer is not reliable fact development."]]},
 {name:"Objection",question:"An objection interrupts the hearing. What now?",speech:"Opposing participant: Objection. The speaker is assuming facts they have not established.",choices:[
 ["Pause, identify the objection, and allow a response",2,3,"The simulation records both sides' arguments before a training decision."],
 ["Automatically sustain every objection",0,0,"A ruling should not be predetermined without examining the objection."],
 ["Silence the objecting participant",-1,-3,"Suppressing a participant does not teach procedural fairness."]]},
 {name:"Closing",question:"What should the decision-maker consider?",speech:"Both sides have been heard. The evidence contains disputed and unresolved facts.",choices:[
 ["Summarize supported facts, uncertainties, and each side's position",3,3,"You finished with a balanced and source-conscious assessment."],
 ["Award money because the plaintiff spoke first",0,-2,"Speaking order is not evidence and cannot justify a decision."],
 ["Choose whichever party seems more likable",0,-2,"Personal preference is no substitute for a fact-based assessment."]]}
];
const store="court-game-simulation-v1", $=id=>document.getElementById(id);
const exhibits={agreement:"Fictional agreement: three fixtures were to be repaired; payment followed satisfactory completion. This is not an authenticated legal exhibit.",invoice:"Fictional invoice: $2,400 billed for repairs. A billing record does not independently prove satisfactory performance.",witnessNote:"Fictional witness note: the witness reports seeing a leaking fixture after the visit. Reliability, timing and personal knowledge need examination."};
function blank(role="defendant"){return {role,step:0,evidence:0,procedure:0,log:[],completed:false};}
function restore(){try{const s=JSON.parse(localStorage.getItem(store));if(s&&typeof s.role==="string"&&Number.isInteger(s.step)&&s.step>=0&&s.step<=6&&Array.isArray(s.log)&&typeof s.evidence==="number"&&typeof s.procedure==="number")return s;}catch{}return blank();}
let state=restore();
function save(){try{localStorage.setItem(store,JSON.stringify(state));}catch{$("result").textContent="Browser storage unavailable. Export your practice record before leaving.";}}
function render(){
 $("role").value=state.role;$("roleInfo").textContent=state.role.toUpperCase()+" • "+(state.completed?"REVIEW":"COURT IN SESSION");
 $("mission").textContent=state.completed?"HEARING COMPLETE":"MISSION "+(state.step+1)+" / "+steps.length;
 $("points").textContent="SKILL SCORE "+Math.max(0,state.evidence+state.procedure);
 $("evidenceScore").textContent=Math.max(0,state.evidence);$("procedureScore").textContent=Math.max(0,state.procedure);
 $("evidenceBar").style.width=Math.min(100,Math.max(0,state.evidence)/15*100)+"%";$("procedureBar").style.width=Math.min(100,Math.max(0,state.procedure)/15*100)+"%";
 $("timeline").replaceChildren(...steps.map((s,i)=>{const li=document.createElement("li");li.textContent=(i+1)+". "+s.name;li.className=i===state.step?"current":i<state.step?"done":"";return li;}));
 $("caseLog").replaceChildren(...state.log.map(entry=>{const li=document.createElement("li");li.textContent=entry;return li;}));
 const area=$("choices");area.replaceChildren();
 if(state.completed){
  $("speaker").textContent="COURT GUIDE";$("speech").textContent="The fictional training hearing is complete. You can restart with another role or export the record.";
  $("question").textContent="Case debrief";const p=document.createElement("p");p.textContent="Your evidence-handling score is "+Math.max(0,state.evidence)+" and fairness score is "+Math.max(0,state.procedure)+". These are educational game metrics, not litigation predictions.";area.append(p);
  const b=document.createElement("button");b.className="choice";b.textContent="PLAY AGAIN";b.onclick=()=>{state=blank(state.role);save();render()};area.append(b);return;
 }
 const current=steps[state.step];$("speaker").textContent=state.step===3?"WITNESS":state.step===4?"OPPOSING PARTICIPANT":"COURT GUIDE";$("speech").textContent=current.speech;$("question").textContent=current.question;
 current.choices.forEach(([label,ev,pr,feedback],i)=>{const b=document.createElement("button");b.className="choice";const tag=document.createElement("span");tag.textContent="OPTION "+(i+1);b.append(tag,document.createTextNode(label));b.addEventListener("click",()=>{state.evidence+=ev;state.procedure+=pr;state.log.push(current.name+": "+label+". "+feedback);state.step++;state.completed=state.step===steps.length;save();render();$("result").textContent=feedback;});area.append(b);});
}
$("role").addEventListener("change",e=>{state=blank(e.target.value);save();$("result").textContent="New role selected. This edition uses shared scenario choices; role-specialized cases are next.";render();});
$("restart").onclick=()=>{state=blank(state.role);save();$("result").textContent="Hearing restarted.";render();};
$("download").onclick=()=>{const blob=new Blob([JSON.stringify({label:"fictional training simulation",...state},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="court-sim-practice.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
for(const [id,key] of [["agreement","agreement"],["invoice","invoice"],["witnessNote","witnessNote"]])$(id).onclick=()=>{$("evidenceText").textContent=exhibits[key];};
render();
