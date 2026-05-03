# Architecture

## Frontend
- Next.js 16 with React 19.
- Routes under `frontend/src/app`.
- Socket.IO client for realtime chat (`/`) and call presence (`/calls`).
- LiveKit React SDK (`@livekit/components-react` + `livekit-client`) for media tracks.

## Backend
- NestJS 11, modules: `auth`, `chat`, `calls`, `prisma`.
- REST endpoints for auth, chat, and call coordination (`/calls/token`, `/calls/:channelId/state`, `/calls/:channelId/annotations`).
- Socket.IO gateways:
  - `ChatGateway` (default namespace) — text chat with JWT-authenticated handshake.
  - `CallsGateway` (`/calls`) — call presence, raise hand, presenter transfer, reactions.

## Database
- PostgreSQL via Prisma ORM.
- Schema includes `User`, `Room`, `Channel`, `Message`, `CallSession`, `Annotation`.
- `Channel.kind` enum (`TEXT | VOICE | VIDEO`) discriminates text channels from media channels.

## Realtime media (LiveKit + coturn)
- A self-hosted LiveKit SFU runs in `docker-compose.prod.yml` next to the backend.
- Signaling: `wss://livekit.neonix.app` proxied by Nginx; media UDP `50000-50100` is opened directly on the firewall (not proxied).
- Self-hosted coturn (`turn.neonix.app`) provides STUN + TURN for clients behind symmetric NATs.
- LiveKit access tokens are issued by the backend and bound to the user id (`identity = userId`); they are short-lived (1h) and refreshed via the `tokenExpiring` event.
- Annotations: deltas via LiveKit data channel (`reliable: true`), periodic snapshot persisted via REST.
- Coordination signals (raise hand, presenter transfer, reactions) ride the `/calls` Socket.IO namespace so they are authoritatively validated by the Neonix backend.

## Redis
- LiveKit room-state coordination on DB index `1`.
- Reserved for the Socket.IO Redis adapter on DB index `0` (multi-instance scale-out).

## Authentication
- JWT signed with `JWT_SECRET`, 7 day TTL.
- HTTP routes use `JwtAuthGuard`; Socket.IO connections authenticate via `socket.handshake.auth.token` (or `Authorization: Bearer …`).
