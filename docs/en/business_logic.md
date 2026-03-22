# Business Logic

## Authentication Flow
- `POST /auth/register` creates a new user with hashed password.
- `POST /auth/login` validates credentials and returns JWT.
- `GET /auth/me` validates JWT and returns user profile.
- JWT secret: `process.env.JWT_SECRET || 'dev_secret_change_me'`.

## Chat Logic
- `GET /rooms` ensures seed data and returns rooms.
- `GET /rooms/:roomId/channels` returns channels in room.
- `GET /rooms/:roomId/channels/:channelId/messages` returns messages.
- `POST /rooms/:roomId/channels/:channelId/messages` writes message.

## Server/Channels Logic
- `ChatService.ensureSeed` auto-creates initial rooms/channels/messages.
- `ChatController` maps REST operations to `ChatService`.
- MQ is not needed; persistent data is in PostgreSQL via Prisma.
