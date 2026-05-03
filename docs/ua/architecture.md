# Architecture

## Frontend
- Next.js 16 with React 19.
- Routes under `frontend/src/app`.
- Socket.IO client for realtime chat (`/`) and call presence (`/calls`).
- LiveKit React SDK (`@livekit/components-react` + `livekit-client`) for media.

## Backend
- NestJS 11, modules: `auth`, `chat`, `calls`, `prisma`.
- REST endpoints for auth, chat, and call coordination (`/calls/token`, `/calls/:channelId/state`, `/calls/:channelId/annotations`).
- Socket.IO gateways:
  - `ChatGateway` (default namespace) — text chat, JWT-authenticated handshake.
  - `CallsGateway` (`/calls`) — call presence, raise hand, presenter transfer, reactions.

## Database
- PostgreSQL via Prisma ORM.
- Schema includes `User`, `Room`, `Channel`, `Message`, `CallSession`, `Annotation`.
- `Channel.kind` enum (`TEXT | VOICE | VIDEO`) discriminates text channels from media channels.

## Realtime media (LiveKit + coturn)
- A self-hosted LiveKit SFU runs in `docker-compose.prod.yml` next to the backend.
- LiveKit signaling is exposed at `wss://livekit.neonix.app` (Nginx proxy).
- Media (RTP/RTCP) traverses UDP ports `50000-50100` directly — these must be opened on the VPS firewall and are **not** proxied through Nginx.
- A self-hosted coturn provides STUN + TURN for clients behind symmetric NATs (`turn.neonix.app`, UDP `3478` + TLS `5349`, relay range `49160-49200`).

### Token issuance flow
```
client ── POST /calls/token  ─────────►  NestJS (CallsService)
                                          ├─ verifies channel.kind ∈ {VOICE, VIDEO}
                                          ├─ mints LiveKit AccessToken (TTL 1h)
                                          └─ ensures CallSession row exists
client ── WSS  livekit.neonix.app ────►  LiveKit SFU (signaling)
client ── UDP  VPS:50000-50100   ─────►  LiveKit SFU (media)
client ◄─ DTLS/SRTP ──────────────────►  other peers via SFU
```

### Coordination signals
- Raise hand / presenter transfer / reactions ride the `/calls` Socket.IO namespace, **not** LiveKit metadata. This keeps the source of truth on Neonix's JWT-authenticated backend; LiveKit room metadata is updated by the backend after each successful presenter grant.
- Annotations: stroke deltas use the LiveKit data channel (`reliable: true`); the backend persists periodic snapshots so late joiners can render the latest state.

## Redis
- Used by LiveKit for room-state coordination on DB index `1`.
- Reserved for the Socket.IO Redis adapter on DB index `0` (multi-instance scale-out).

## Authentication
- JWTs are signed with `JWT_SECRET` (env), 7 day TTL.
- HTTP routes that require auth use `JwtAuthGuard` (`backend/src/common/guards/jwt-auth.guard.ts`).
- Sockets verify the JWT via `authenticateSocket()` in `handleConnection`. The token is supplied through `socket.handshake.auth.token` (preferred) or as a Bearer `Authorization` header.
- LiveKit access tokens are bound to the user id (`identity = userId`) and are **independent** of Neonix JWTs — they are minted on demand and refreshed on `tokenExpiring` events.
