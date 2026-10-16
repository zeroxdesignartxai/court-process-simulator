/**
 * Court Process Simulator: deterministic educational case engine v0.2.
 * Fictional contract-dispute workflow; no real legal deadlines or rulings.
 * No model-generated content can directly mutate the state.
 */
export const STAGES = Object.freeze(["intake","pleadings","evidence","hearing","conclusion","closed"]);
export const ROLES = Object.freeze(["judge","plaintiff","defendant","counsel_plaintiff","counsel_defendant","witness","clerk"]);
const ACTIONS = Object.freeze({
  intake: {IDENTIFY_ISSUES:["judge","plaintiff","defendant","counsel_plaintiff","counsel_defendant","clerk","witness"]},
  pleadings: {RECORD_POSITIONS:["judge","plaintiff","defendant","counsel_plaintiff","counsel_defendant","clerk"]},
  evidence: {MARK_EXHIBIT:["judge","plaintiff","defendant","counsel_plaintiff","counsel_defendant","clerk"]},
  hearing: {ASK_QUESTION:["judge","plaintiff","defendant","counsel_plaintiff","counsel_defendant"],ANSWER_QUESTION:["witness"],RECORD_HEARING:["clerk"]},
  conclusion: {SUMMARIZE_LEARNING:ROLES},
  closed: {}
});
export class SimulationError extends Error {
  constructor(code,message){super(message);this.name="SimulationError";this.code=code;}
}
function assert(condition,code,message){if(!condition)throw new SimulationError(code,message);}
function safeText(text,max=500){assert(typeof text==="string"&&text.trim().length>0&&text.length<=max,"INVALID_INPUT",`A nonempty text of at most ${max} characters is required`);return text.trim();}
function ensureSession(session){assert(session&&session.schemaVersion===2&&ROLES.includes(session.role)&&STAGES.includes(session.stage)&&Array.isArray(session.events)&&typeof session.sessionId==="string","BAD_SESSION","Invalid session");}
export function newSession({sessionId,role="defendant",scenarioId="fictional-contract-001"}={}){
  const id=safeText(sessionId??"local-practice",100);
  assert(ROLES.includes(role),"INVALID_ROLE","Unsupported role");
  assert(scenarioId==="fictional-contract-001","UNKNOWN_SCENARIO","Unsupported scenario");
  return {schemaVersion:2,sessionId:id,scenarioId,role,stage:"intake",events:[],completed:false};
}
export function availableActions(session){ensureSession(session);return Object.entries(ACTIONS[session.stage]).filter(([,roles])=>roles.includes(session.role)).map(([kind])=>kind);}
const ADVANCE={intake:"pleadings",pleadings:"evidence",evidence:"hearing",hearing:"conclusion",conclusion:"closed"};
/** Pure reducer. Caller must authenticate actor and persist result atomically on server in production. */
export function dispatch(session,command){
  ensureSession(session);
  assert(!session.completed,"SESSION_CLOSED","This session is complete");
  assert(command&&typeof command==="object","INVALID_COMMAND","Command must be an object");
  const {kind,payload={},idempotencyKey}=command;
  const key=safeText(idempotencyKey,120);
  const prior=session.events.find(e=>e.idempotencyKey===key);
  if(prior){assert(prior.kind===kind&&JSON.stringify(prior.payload)===JSON.stringify(payload),"IDEMPOTENCY_CONFLICT","Key already used for a different request");return {session,event:prior,replayed:true};}
  assert(availableActions(session).includes(kind),"FORBIDDEN","Action is not permitted for this role and stage");
  assert(payload&&typeof payload==="object"&&!Array.isArray(payload),"INVALID_PAYLOAD","Payload must be an object");
  const validated={};
  if(kind==="MARK_EXHIBIT"){assert(["A","B"].includes(payload.exhibitId),"INVALID_EXHIBIT","Choose Exhibit A or B");validated.exhibitId=payload.exhibitId;}
  else if(kind==="ASK_QUESTION"||kind==="ANSWER_QUESTION"){validated.statement=safeText(payload.statement,500);}
  else if(kind==="RECORD_HEARING"){validated.note=safeText(payload.note,500);}
  else if(kind==="SUMMARIZE_LEARNING"){validated.reflection=safeText(payload.reflection,500);}
  else if(kind==="IDENTIFY_ISSUES"||kind==="RECORD_POSITIONS"){validated.note=safeText(payload.note,500);}
  const event={sequence:session.events.length+1,idempotencyKey:key,kind,role:session.role,stage:session.stage,payload:validated};
  const nextStage=ADVANCE[session.stage];
  const next={...session,stage:nextStage,events:[...session.events,event],completed:nextStage==="closed"};
  return {session:next,event,replayed:false};
}
/** Rebuild and check a session from its append-only command events. */
export function replay({sessionId,role,scenarioId="fictional-contract-001",events}){
  assert(Array.isArray(events),"INVALID_EVENTS","Events must be an array");
  let session=newSession({sessionId,role,scenarioId});
  for(const e of events){assert(e&&e.sequence===session.events.length+1&&e.role===role&&e.stage===session.stage,"CORRUPT_LOG","Event order, role or stage mismatch");const result=dispatch(session,{kind:e.kind,payload:e.payload,idempotencyKey:e.idempotencyKey});session=result.session;}
  return session;
}
