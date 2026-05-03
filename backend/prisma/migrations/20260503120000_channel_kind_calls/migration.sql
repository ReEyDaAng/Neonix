-- CreateEnum
CREATE TYPE "ChannelKind" AS ENUM ('TEXT', 'VOICE', 'VIDEO');

-- AlterTable
ALTER TABLE "Channel" ADD COLUMN "kind" "ChannelKind" NOT NULL DEFAULT 'TEXT';

-- CreateTable
CREATE TABLE "CallSession" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "livekitRoom" TEXT NOT NULL,
    "presenterUserId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "CallSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CallSession_channelId_idx" ON "CallSession"("channelId");

-- CreateTable
CREATE TABLE "Annotation" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Annotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Annotation_channelId_createdAt_idx" ON "Annotation"("channelId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_roomId_channelId_createdAt_idx" ON "Message"("roomId", "channelId", "createdAt");

-- AddForeignKey
ALTER TABLE "CallSession" ADD CONSTRAINT "CallSession_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
