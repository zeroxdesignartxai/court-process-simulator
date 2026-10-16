# PostgreSQL migration plan

The SQL in `001_initial.sql` defines the target relational data model. It is deliberately not applied to an unrelated connected Supabase project.

The currently deployed/demo server uses a JSON store. This migration is a **schema artifact only**, not an activated database integration.

Required activation sequence:
1. Choose a dedicated project and confirm credentials and region.
2. Back up the existing JSON store, if any; stop writes during migration.
3. Apply migration to a dedicated private database with least-privilege SQL credentials.
4. Implement and test the PostgreSQL persistence adapter, including transactions and `SELECT ... FOR UPDATE` for case commands.
5. Verify idempotency under concurrent requests, authorization, crash recovery, and migrations using a test database.
6. Switch to PostgreSQL in staging only after those checks pass.

Do not store confidential client information in the training prototype. Keep database credentials server-side only.

Supabase-specific: RLS is enabled and grants are revoked for public API roles by default. Never expose the service-role key in browser code.
