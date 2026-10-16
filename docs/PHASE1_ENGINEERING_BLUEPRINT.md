# Court Process Simulator — Phase 1 engineering blueprint

Status: planning baseline, not proof of deployed functionality.
Scope: California civil unlawful detainer educational simulator, extensible to additional courts and cases.

## Non-negotiable requirements
- Educational simulation only, with conspicuous separation from actual legal advice and no claims of likely case outcome.
- Source-backed legal explanations. Never invent a statute, case, rule, deadline, or citation.
- Store court jurisdiction, case type, governing rule version/effective date, and source provenance for every procedural rule.
- AI agents can propose dialogue and arguments but cannot mutate procedural state without validated commands.
- All actions are subject to role authorization, case-stage invariants, and an append-only audit trail.
- Uploaded evidence is private by default, with consent, retention and deletion controls.

## Initial roles
JUDGE: call matters, control hearings, receive motions, make training rulings, issue findings.
PLAINTIFF: initiate case, submit exhibits, argue claims, examine witnesses.
DEFENDANT: file a response, submit exhibits, argue defenses, examine witnesses.
COUNSEL: acts for assigned party only, may motion/object/examine/argue.
WITNESS: answer the pending question within persona knowledge.
CLERK: docket procedural events, administer permitted administrative actions.
INSTRUCTOR: create reviewed scenarios, evaluate learner performance.
Note: instructors do not control judicial outcomes during learner sessions.

## Suggested service boundaries
1. Web frontend: case selection, role picker, hearing room, transcript, timeline, exhibits, source panel, feedback.
2. Identity/authorization: users, organizations, roles, case membership and access policy.
3. Simulation orchestrator: routes turns to assigned agents and tools.
4. Procedure engine: versioned deterministic case transitions and deadlines.
5. Legal reference service: retrieval of official primary sources with verification dates.
6. Evidence service: encrypted object storage, hashes, admissibility state, provenance.
7. Assessment service: rubric-based feedback with evidence from the session.
8. Audit service: immutable event log, source ids, model/rule versions.

## Suggested canonical schema
- jurisdictions(id, name, court_level, locality)
- source_documents(id, url, authority_type, title, published_at, effective_from, effective_to, fetched_at, checksum, verification_status)
- procedural_rules(id, jurisdiction_id, case_type, citation, source_document_id, effective_from, effective_to, condition_json, transition_json, review_status)
- scenarios(id, jurisdiction_id, case_type, version, title, facts_json, learning_objectives_json, review_status)
- sessions(id, scenario_id, owner_id, stage, created_at, updated_at, simulation_clock)
- participants(id, session_id, user_id, role, side, persona_json)
- events(id, session_id, sequence, actor_id, kind, payload_json, rule_id, occurred_at, content_hash)
- exhibits(id, session_id, submitted_by, storage_key, sha256, status, metadata_json)
- citations(id, event_id, source_document_id, pinpoint, verification_status)
- assessments(id, session_id, rubric_version, results_json, generated_at)

## Allowed stage transitions (starter scenario)
INTAKE -> PRE_FILING -> FILED -> SERVICE -> RESPONSIVE_PLEADING -> DISCOVERY -> PRETRIAL -> HEARING_OR_TRIAL -> JUDGMENT -> POST_JUDGMENT -> CLOSED.
Branches, stays, dismissals, defaults, appeals and parallel motions require separately defined, tested transitions. Do not treat this simple sequence as actual California law.

## Command contract
Input: {session_id, actor_id, command, payload, idempotency_key}
Processing: authenticate -> authorize -> validate against scenario/rules/effective dates -> append event transactionally -> update materialized state -> optional AI response with verified citations.
Output: {accepted, event_id, case_state, citations, explanation, errors}.
Commands include SUBMIT_PLEADING, FILE_MOTION, PRESENT_EXHIBIT, OBJECT, RULE_ON_OBJECTION, QUESTION_WITNESS, RECORD_FINDING, ADVANCE_STAGE.

## First vertical slice acceptance criteria
1. Learner starts a fictional California UD case with fixed, attorney-reviewed facts.
2. Learner selects plaintiff, defendant, judge or counsel and sees role-appropriate commands.
3. Server rejects every unauthorized action and logs the rejection without mutating session state.
4. Test scenario advances only across approved transitions; no free-form LLM stage updates.
5. Exhibits are uploaded, hashed, linked to the session, and retrieved with role-based access.
6. Simulated hearing supports an objection, an answer, an explained ruling and accurate transcript order.
7. Every legal proposition shown as verified has a real working primary-source link and pinpoint.
8. Save and reload restores case state, roles, exhibits, transcript, and source references.
9. Instructor receives an auditable rubric report without unsupported outcome predictions.
10. E2E, security and accessibility checks pass in staging before any production release.

## Priority test cases
- Other-party exhibit access blocked; cross-organization access blocked.
- Duplicate command idempotent; concurrent commands preserve event order.
- Missing or expired rule citation causes 'source unavailable' rather than an invented answer.
- Conflicting source versions require explicit resolution; historical case uses historically applicable law.
- Session transcript agrees with event log; a restore does not change previous rulings.
- AI agents cannot call unauthorized tools or override judge/court rule state.

## Implementation milestones
M1: repository audit, stack confirmation, design tokens, auth and data migration plan.
M2: scenario/session/events schema + role policy + deterministic transition engine.
M3: first reviewed California UD scenario + primary-source index.
M4: hearing room UI + multi-role AI dialogue + objections + exhibits.
M5: automated legal/source/e2e/security evaluation + staging deployment.

## Deployment and scope gates
Do not represent this file as a deployed application. Inspect existing project infrastructure and confirm deployment access before modifying live systems. No actual legal filings, user-specific legal advice, case predictions, or external court integrations are authorized in this phase.
