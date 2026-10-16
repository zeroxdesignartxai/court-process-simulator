# Version 0.3 release gate — October 2026

## Confirmed
- Source committed to development branch.
- Local server API and browser account workspace are implemented in source.
- Test specifications and GitHub Actions workflow exist.
- Initial PostgreSQL schema has been added separately.

## Not yet confirmed
- A successful real execution of backend tests and full CI run.
- Staging deployment or live site operation.
- A project-specific PostgreSQL connection; all discovered Supabase projects are inactive and none is verified as belonging to Court Process Simulator.
- Rate limiting, email verification, account recovery, external audit and penetration tests.
- Migration from browser JSON storage to a transactional PostgreSQL repository.
- Legal-source accuracy validation.

## Stop-ship conditions
Do not deploy the existing JSON backend to public production for real client case information. Do not enable any database connection without verifying project ownership and testing security and transactions. Do not claim legal advice or an authoritative court outcome.
