# Simulation engine v0.2 (isolated module)

Pure JavaScript ESM state engine for a fictional civil contract dispute. Provides role-restricted commands, validation, deterministic stage transitions, idempotency keys, event records, and replay.

Run the test suite with Node.js 20+: `node --test engine/core.test.mjs` from repository root.

This is **not a production backend**. Client-controlled state and roles are not a security boundary; a future API must authenticate users, authorize access to stored sessions, validate rule versions and legal sources, persist state transactionally, and independently evaluate AI output. The five stage labels are a teaching sequence, not verified California legal procedure. Does not use AI, calculate actual legal deadlines, or give legal advice.

Existing `prototype/` is unchanged. Integrate only after its UI and data persistence are migrated onto a server-authorized API.
