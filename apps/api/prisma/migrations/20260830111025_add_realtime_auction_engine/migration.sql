-- CreateEnum
CREATE TYPE "AuctionEventType" AS ENUM (
    'NOMINATED',
    'STARTED',
    'BID_PLACED',
    'LAST_CALL',
    'SOLD',
    'UNSOLD',
    'CANCELLED'
);

-- Add the column as nullable so existing auctions can be migrated safely.
ALTER TABLE "Auction"
ADD COLUMN "nominatedByParticipantId" TEXT;

-- Prefer the match host's participant record. Fall back to the earliest
-- participant if an older auction was not created by the host.
UPDATE "Auction" AS auction
SET "nominatedByParticipantId" = (
    SELECT participant."id"
    FROM "MatchParticipant" AS participant
    INNER JOIN "Match" AS match_record
        ON match_record."id" = auction."matchId"
    WHERE participant."matchId" = auction."matchId"
    ORDER BY
        CASE
            WHEN participant."userId" = match_record."createdById" THEN 0
            ELSE 1
        END,
        participant."joinedAt" ASC,
        participant."id" ASC
    LIMIT 1
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "Auction"
        WHERE "nominatedByParticipantId" IS NULL
    ) THEN
        RAISE EXCEPTION
            'Cannot migrate auctions without a match participant.';
    END IF;
END;
$$;

ALTER TABLE "Auction"
ALTER COLUMN "nominatedByParticipantId" SET NOT NULL;

-- Add bid metadata as nullable before backfilling legacy records.
ALTER TABLE "Bid"
ADD COLUMN "auctionVersion" INTEGER,
ADD COLUMN "idempotencyKey" VARCHAR(128);

UPDATE "Bid"
SET
    "auctionVersion" = GREATEST("sequence", 1),
    "idempotencyKey" = 'legacy:' || "id";

ALTER TABLE "Bid"
ALTER COLUMN "auctionVersion" SET NOT NULL,
ALTER COLUMN "idempotencyKey" SET NOT NULL;

-- CreateTable
CREATE TABLE "PlayerOwnership" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "acquisitionPrice" INTEGER NOT NULL,
    "acquiredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerOwnership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuctionEvent" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "participantId" TEXT,
    "type" "AuctionEventType" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "auctionVersion" INTEGER NOT NULL,
    "statusAfter" "AuctionStatus" NOT NULL,
    "amount" INTEGER,
    "payload" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuctionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerOwnership_auctionId_key"
ON "PlayerOwnership"("auctionId");

-- CreateIndex
CREATE INDEX "PlayerOwnership_participantId_acquiredAt_idx"
ON "PlayerOwnership"("participantId", "acquiredAt");

-- CreateIndex
CREATE INDEX "PlayerOwnership_playerId_idx"
ON "PlayerOwnership"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerOwnership_matchId_playerId_key"
ON "PlayerOwnership"("matchId", "playerId");

-- CreateIndex
CREATE INDEX "AuctionEvent_auctionId_createdAt_idx"
ON "AuctionEvent"("auctionId", "createdAt");

-- CreateIndex
CREATE INDEX "AuctionEvent_participantId_createdAt_idx"
ON "AuctionEvent"("participantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuctionEvent_type_createdAt_idx"
ON "AuctionEvent"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuctionEvent_auctionId_sequence_key"
ON "AuctionEvent"("auctionId", "sequence");

-- CreateIndex
CREATE INDEX "Auction_nominatedByParticipantId_idx"
ON "Auction"("nominatedByParticipantId");

-- CreateIndex
CREATE UNIQUE INDEX "Bid_auctionId_participantId_idempotencyKey_key"
ON "Bid"("auctionId", "participantId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "Auction"
ADD CONSTRAINT "Auction_nominatedByParticipantId_fkey"
FOREIGN KEY ("nominatedByParticipantId")
REFERENCES "MatchParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerOwnership"
ADD CONSTRAINT "PlayerOwnership_matchId_fkey"
FOREIGN KEY ("matchId")
REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerOwnership"
ADD CONSTRAINT "PlayerOwnership_participantId_fkey"
FOREIGN KEY ("participantId")
REFERENCES "MatchParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerOwnership"
ADD CONSTRAINT "PlayerOwnership_playerId_fkey"
FOREIGN KEY ("playerId")
REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerOwnership"
ADD CONSTRAINT "PlayerOwnership_auctionId_fkey"
FOREIGN KEY ("auctionId")
REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionEvent"
ADD CONSTRAINT "AuctionEvent_auctionId_fkey"
FOREIGN KEY ("auctionId")
REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionEvent"
ADD CONSTRAINT "AuctionEvent_participantId_fkey"
FOREIGN KEY ("participantId")
REFERENCES "MatchParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Bid idempotency keys must contain meaningful values.
ALTER TABLE "Bid"
ADD CONSTRAINT "Bid_idempotency_key_check"
CHECK (
    char_length(btrim("idempotencyKey")) BETWEEN 1 AND 128
);

-- Accepted bids must reference a positive auction version.
ALTER TABLE "Bid"
ADD CONSTRAINT "Bid_auction_version_check"
CHECK ("auctionVersion" > 0);

-- A player can only be acquired for a positive amount.
ALTER TABLE "PlayerOwnership"
ADD CONSTRAINT "PlayerOwnership_price_check"
CHECK ("acquisitionPrice" > 0);

-- Auction history sequence and snapshot values must be valid.
ALTER TABLE "AuctionEvent"
ADD CONSTRAINT "AuctionEvent_values_check"
CHECK (
    "sequence" > 0
    AND "auctionVersion" >= 0
    AND ("amount" IS NULL OR "amount" > 0)
);

-- Bid and sale events must record the participant and amount.
ALTER TABLE "AuctionEvent"
ADD CONSTRAINT "AuctionEvent_actor_check"
CHECK (
    (
        "type" NOT IN ('NOMINATED', 'BID_PLACED', 'SOLD')
        OR "participantId" IS NOT NULL
    )
    AND (
        "type" NOT IN ('BID_PLACED', 'SOLD')
        OR "amount" IS NOT NULL
    )
);

-- Every audit event must agree with its resulting auction state.
ALTER TABLE "AuctionEvent"
ADD CONSTRAINT "AuctionEvent_state_check"
CHECK (
    ("type" = 'NOMINATED' AND "statusAfter" = 'WAITING')
    OR ("type" = 'STARTED' AND "statusAfter" = 'ACTIVE')
    OR (
        "type" = 'BID_PLACED'
        AND "statusAfter" IN ('ACTIVE', 'LAST_CALL')
    )
    OR ("type" = 'LAST_CALL' AND "statusAfter" = 'LAST_CALL')
    OR ("type" = 'SOLD' AND "statusAfter" = 'SOLD')
    OR ("type" = 'UNSOLD' AND "statusAfter" = 'UNSOLD')
    OR ("type" = 'CANCELLED' AND "statusAfter" = 'CANCELLED')
);

-- Accepted bids, ownership records, and auction history are append-only.
-- Match cleanup may still cascade-delete them.
CREATE FUNCTION "prevent_auction_record_update"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Auction audit records are immutable.'
        USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "Bid_prevent_update"
BEFORE UPDATE ON "Bid"
FOR EACH ROW
EXECUTE FUNCTION "prevent_auction_record_update"();

CREATE TRIGGER "PlayerOwnership_prevent_update"
BEFORE UPDATE ON "PlayerOwnership"
FOR EACH ROW
EXECUTE FUNCTION "prevent_auction_record_update"();

CREATE TRIGGER "AuctionEvent_prevent_update"
BEFORE UPDATE ON "AuctionEvent"
FOR EACH ROW
EXECUTE FUNCTION "prevent_auction_record_update"();