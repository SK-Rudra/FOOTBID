-- DropForeignKey
ALTER TABLE "AuctionEvent"
DROP CONSTRAINT "AuctionEvent_participantId_fkey";

-- DropForeignKey
ALTER TABLE "BudgetTransaction"
DROP CONSTRAINT "BudgetTransaction_auctionId_fkey";

-- AddForeignKey
ALTER TABLE "AuctionEvent"
ADD CONSTRAINT "AuctionEvent_participantId_fkey"
FOREIGN KEY ("participantId")
REFERENCES "MatchParticipant"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetTransaction"
ADD CONSTRAINT "BudgetTransaction_auctionId_fkey"
FOREIGN KEY ("auctionId")
REFERENCES "Auction"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;