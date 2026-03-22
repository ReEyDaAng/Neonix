# Test Driven Documentation

Tests in `backend/test` demonstrate API usage and output expectations.

## Auth tests
- `auth.int.e2e-spec.ts` covers register/login/me flows.
- Shows valid/invalid credential behavior.

## Chat tests
- `chat.int.e2e-spec.ts` covers room/channel/message retrieval.
- Demonstrates seeding and persistent chat operations.

## Strategy
- Write new tests when API behavior changes.
- Use existing tests as living documentation for expected business flows.
