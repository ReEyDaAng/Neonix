# Architecture

## Frontend
- Next.js 16 with React 19.
- Routes under `frontend/src/app`.
- Socket.IO client for realtime.

## Backend
- NestJS 11, modules: `auth`, `chat`, `prisma`.
- REST endpoints for auth and chat.
- WebSocket gateway for realtime chat events.

## Database
- PostgreSQL via Prisma ORM.
- Schema includes `User`, `Room`, `Channel`, `Message`.

## Redis
- Not currently used in this codebase, but can be used for session/caching/WS scaling.

## WebSocket Layer
- `ChatGateway` exposes `join`, `typing`, `message` events.
- `room:*` and `channel:*` socket namespaces for targeted broadcasts.
