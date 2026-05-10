-- Channel name must be unique within a room (prevents seed race + UI confusion)
CREATE UNIQUE INDEX IF NOT EXISTS "Channel_roomId_name_key" ON "Channel"("roomId", "name");
