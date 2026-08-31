/*
  Warnings:

  - Made the column `tacticalStyle` on table `Manager` required. This step will fail if there are existing NULL values in that column.

*/

-- Backfill existing managers before enforcing the required tactical style.
UPDATE "Manager"
SET "tacticalStyle" = 'Balanced'
WHERE "tacticalStyle" IS NULL;

-- AlterTable
ALTER TABLE "Manager" ADD COLUMN     "attackingBonus" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "chemistryBonus" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "defendingBonus" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "defensivePhilosophy" VARCHAR(40) NOT NULL DEFAULT 'Balanced',
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "marketValue" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "midfieldBonus" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "passingPhilosophy" VARCHAR(40) NOT NULL DEFAULT 'Balanced',
ADD COLUMN     "preferredFormations" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "pressingStyle" VARCHAR(40) NOT NULL DEFAULT 'Balanced',
ALTER COLUMN "tacticalStyle" SET NOT NULL,
ALTER COLUMN "tacticalStyle" SET DEFAULT 'Balanced';

-- CreateTable
CREATE TABLE "ManagerOwnership" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "acquisitionPrice" INTEGER NOT NULL,
    "acquiredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagerOwnership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManagerOwnership_participantId_key" ON "ManagerOwnership"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagerOwnership_auctionId_key" ON "ManagerOwnership"("auctionId");

-- CreateIndex
CREATE INDEX "ManagerOwnership_participantId_acquiredAt_idx" ON "ManagerOwnership"("participantId", "acquiredAt");

-- CreateIndex
CREATE INDEX "ManagerOwnership_managerId_idx" ON "ManagerOwnership"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagerOwnership_matchId_managerId_key" ON "ManagerOwnership"("matchId", "managerId");

-- CreateIndex
CREATE INDEX "Manager_overall_idx" ON "Manager"("overall");

-- CreateIndex
CREATE INDEX "Manager_tacticalStyle_idx" ON "Manager"("tacticalStyle");

-- CreateIndex
CREATE INDEX "Manager_isActive_idx" ON "Manager"("isActive");

-- AddForeignKey
ALTER TABLE "ManagerOwnership" ADD CONSTRAINT "ManagerOwnership_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerOwnership" ADD CONSTRAINT "ManagerOwnership_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "MatchParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerOwnership" ADD CONSTRAINT "ManagerOwnership_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Manager"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerOwnership" ADD CONSTRAINT "ManagerOwnership_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;