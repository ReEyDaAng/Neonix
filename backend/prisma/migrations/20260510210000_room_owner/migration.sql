-- Add owner reference to Room. Existing rooms remain ownerless (NULL) — they
-- continue to function but cannot use owner-only operations until reassigned.
ALTER TABLE "Room" ADD COLUMN "ownerId" TEXT;

ALTER TABLE "Room"
  ADD CONSTRAINT "Room_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Room_ownerId_idx" ON "Room"("ownerId");
