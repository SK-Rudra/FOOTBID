-- CreateEnum
CREATE TYPE "BudgetTransactionType" AS ENUM ('RESERVATION', 'RELEASE', 'PURCHASE', 'REFUND');

-- CreateTable
CREATE TABLE "BudgetTransaction" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "auctionId" TEXT,
    "type" "BudgetTransactionType" NOT NULL,
    "itemType" "AuctionType",
    "itemId" VARCHAR(100),
    "amount" INTEGER NOT NULL,
    "availableAfter" INTEGER NOT NULL,
    "reservedAfter" INTEGER NOT NULL,
    "spentAfter" INTEGER NOT NULL,
    "idempotencyKey" VARCHAR(128) NOT NULL,
    "purchaseKey" VARCHAR(160),
    "description" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetTransaction_participantId_createdAt_idx" ON "BudgetTransaction"("participantId", "createdAt");

-- CreateIndex
CREATE INDEX "BudgetTransaction_auctionId_idx" ON "BudgetTransaction"("auctionId");

-- CreateIndex
CREATE INDEX "BudgetTransaction_type_createdAt_idx" ON "BudgetTransaction"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetTransaction_participantId_idempotencyKey_key" ON "BudgetTransaction"("participantId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetTransaction_participantId_purchaseKey_key" ON "BudgetTransaction"("participantId", "purchaseKey");

-- AddForeignKey
ALTER TABLE "BudgetTransaction" ADD CONSTRAINT "BudgetTransaction_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "MatchParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetTransaction" ADD CONSTRAINT "BudgetTransaction_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Ledger amounts must always be positive.
ALTER TABLE "BudgetTransaction"
ADD CONSTRAINT "BudgetTransaction_amount_check"
CHECK ("amount" > 0);

-- Every ledger snapshot must preserve the fixed €150M wallet.
ALTER TABLE "BudgetTransaction"
ADD CONSTRAINT "BudgetTransaction_snapshot_check"
CHECK (
  "availableAfter" >= 0
  AND "reservedAfter" >= 0
  AND "spentAfter" >= 0
  AND "availableAfter" + "reservedAfter" + "spentAfter" = 150000000
);

-- Idempotency keys must contain a meaningful value.
ALTER TABLE "BudgetTransaction"
ADD CONSTRAINT "BudgetTransaction_idempotency_key_check"
CHECK (
  char_length(btrim("idempotencyKey")) BETWEEN 1 AND 128
);

-- Purchases require an item identity and a canonical duplicate-protection key.
ALTER TABLE "BudgetTransaction"
ADD CONSTRAINT "BudgetTransaction_purchase_reference_check"
CHECK (
  (
    "type" = 'PURCHASE'
    AND "itemType" IS NOT NULL
    AND "itemId" IS NOT NULL
    AND char_length(btrim("itemId")) BETWEEN 1 AND 100
    AND "purchaseKey" = ("itemType"::text || ':' || "itemId")
  )
  OR
  (
    "type" <> 'PURCHASE'
    AND "purchaseKey" IS NULL
  )
);

-- Ledger entries are append-only. Match cleanup may still cascade-delete them.
CREATE FUNCTION "prevent_budget_transaction_update"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Budget transactions are immutable.'
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "BudgetTransaction_prevent_update"
BEFORE UPDATE ON "BudgetTransaction"
FOR EACH ROW
EXECUTE FUNCTION "prevent_budget_transaction_update"();