-- Preserve the existing shared formation as a separate neutral fallback.
UPDATE "Formation"
SET
    "code" = '4-4-2-basic',
    "name" = 'Basic 4-4-2',
    "description" = 'Free balanced fallback formation available to every participant.'
WHERE
    "code" = '4-4-2'
    AND "isNeutral" = true;
-- DropIndex
DROP INDEX "Formation_tier_isNeutral_idx";

-- AlterTable
ALTER TABLE "Formation" ADD COLUMN     "attackingBonus" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "attackingStyle" VARCHAR(40) NOT NULL DEFAULT 'Balanced',
ADD COLUMN     "buildUpStyle" VARCHAR(40) NOT NULL DEFAULT 'Balanced',
ADD COLUMN     "chemistryBonus" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "defendingBonus" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "defensiveStyle" VARCHAR(40) NOT NULL DEFAULT 'Balanced',
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "marketValue" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "midfieldBonus" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pressingIntensity" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "tempo" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "width" INTEGER NOT NULL DEFAULT 50;

-- CreateTable
CREATE TABLE "FormationOwnership" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "acquisitionPrice" INTEGER NOT NULL,
    "acquiredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormationOwnership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FormationOwnership_participantId_key" ON "FormationOwnership"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "FormationOwnership_auctionId_key" ON "FormationOwnership"("auctionId");

-- CreateIndex
CREATE INDEX "FormationOwnership_participantId_acquiredAt_idx" ON "FormationOwnership"("participantId", "acquiredAt");

-- CreateIndex
CREATE INDEX "FormationOwnership_formationId_idx" ON "FormationOwnership"("formationId");

-- CreateIndex
CREATE UNIQUE INDEX "FormationOwnership_matchId_formationId_key" ON "FormationOwnership"("matchId", "formationId");

-- CreateIndex
CREATE INDEX "Formation_tier_isNeutral_isActive_idx" ON "Formation"("tier", "isNeutral", "isActive");

-- CreateIndex
CREATE INDEX "Formation_buildUpStyle_idx" ON "Formation"("buildUpStyle");

-- CreateIndex
CREATE INDEX "Formation_marketValue_idx" ON "Formation"("marketValue");

-- AddForeignKey
ALTER TABLE "FormationOwnership" ADD CONSTRAINT "FormationOwnership_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormationOwnership" ADD CONSTRAINT "FormationOwnership_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "MatchParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormationOwnership" ADD CONSTRAINT "FormationOwnership_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormationOwnership" ADD CONSTRAINT "FormationOwnership_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
