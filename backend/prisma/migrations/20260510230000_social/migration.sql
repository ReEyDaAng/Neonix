-- Social layer: room membership, friendships, room invitations.

-- Enums
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED');
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- RoomMembership
CREATE TABLE "RoomMembership" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoomMembership_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RoomMembership_roomId_userId_key" ON "RoomMembership"("roomId", "userId");
CREATE INDEX "RoomMembership_userId_idx" ON "RoomMembership"("userId");
ALTER TABLE "RoomMembership" ADD CONSTRAINT "RoomMembership_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomMembership" ADD CONSTRAINT "RoomMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Friendship
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "addresseeId" TEXT NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Friendship_requesterId_addresseeId_key" ON "Friendship"("requesterId", "addresseeId");
CREATE INDEX "Friendship_addresseeId_status_idx" ON "Friendship"("addresseeId", "status");
CREATE INDEX "Friendship_requesterId_status_idx" ON "Friendship"("requesterId", "status");
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RoomInvitation
CREATE TABLE "RoomInvitation" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    CONSTRAINT "RoomInvitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RoomInvitation_roomId_inviteeId_key" ON "RoomInvitation"("roomId", "inviteeId");
CREATE INDEX "RoomInvitation_inviteeId_status_idx" ON "RoomInvitation"("inviteeId", "status");
ALTER TABLE "RoomInvitation" ADD CONSTRAINT "RoomInvitation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomInvitation" ADD CONSTRAINT "RoomInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomInvitation" ADD CONSTRAINT "RoomInvitation_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every existing room becomes a membership for its owner (if any).
-- Rooms without an owner remain accessible to no one — those are seed/legacy
-- rooms; we'll let them stay in the DB but they will not show up in any
-- user's room list until membership is created (e.g. via invitation flow).
INSERT INTO "RoomMembership" ("id", "roomId", "userId", "joinedAt")
SELECT gen_random_uuid(), r.id, r."ownerId", NOW()
FROM "Room" r
WHERE r."ownerId" IS NOT NULL
ON CONFLICT ("roomId", "userId") DO NOTHING;
