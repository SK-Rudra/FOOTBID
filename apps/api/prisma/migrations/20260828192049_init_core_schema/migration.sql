-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "PreferredFoot" AS ENUM ('LEFT', 'RIGHT', 'BOTH');

-- CreateEnum
CREATE TYPE "PlayerPosition" AS ENUM ('GK', 'LB', 'LWB', 'CB', 'RB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST');

-- CreateEnum
CREATE TYPE "ContentTier" AS ENUM ('FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('WAITING', 'AUCTION', 'SQUAD_BUILDING', 'READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ParticipantSide" AS ENUM ('PLAYER_ONE', 'PLAYER_TWO');

-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('CONNECTED', 'READY', 'DISCONNECTED', 'LEFT');

-- CreateEnum
CREATE TYPE "AuctionType" AS ENUM ('PLAYER', 'MANAGER', 'FORMATION');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('WAITING', 'ACTIVE', 'LAST_CALL', 'SOLD', 'UNSOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SquadRole" AS ENUM ('STARTER', 'SUBSTITUTE', 'RESERVE');

-- CreateEnum
CREATE TYPE "MatchEventType" AS ENUM ('KICKOFF', 'GOAL', 'OWN_GOAL', 'YELLOW_CARD', 'RED_CARD', 'SUBSTITUTION', 'INJURY', 'PENALTY_SCORED', 'PENALTY_MISSED', 'HALF_TIME', 'SECOND_HALF_START', 'FULL_TIME');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "username" VARCHAR(32) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "displayName" VARCHAR(80) NOT NULL,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSeenAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "logoUrl" TEXT,
    "logoLicense" VARCHAR(255),
    "sourceProvider" VARCHAR(80),
    "sourceLeagueId" VARCHAR(100),
    "dataVersion" VARCHAR(32) NOT NULL DEFAULT '1.0.0',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT,
    "name" VARCHAR(100) NOT NULL,
    "shortName" VARCHAR(20) NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "logoUrl" TEXT,
    "logoLicense" VARCHAR(255),
    "sourceProvider" VARCHAR(80),
    "sourceClubId" VARCHAR(100),
    "dataVersion" VARCHAR(32) NOT NULL DEFAULT '1.0.0',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT,
    "clubId" TEXT,
    "fullName" VARCHAR(120) NOT NULL,
    "shortName" VARCHAR(80) NOT NULL,
    "nationalityCode" CHAR(2) NOT NULL,
    "dateOfBirth" DATE,
    "primaryPosition" "PlayerPosition" NOT NULL,
    "secondaryPositions" "PlayerPosition"[] DEFAULT ARRAY[]::"PlayerPosition"[],
    "preferredFoot" "PreferredFoot" NOT NULL,
    "overall" INTEGER NOT NULL,
    "pace" INTEGER NOT NULL,
    "shooting" INTEGER NOT NULL,
    "passing" INTEGER NOT NULL,
    "dribbling" INTEGER NOT NULL,
    "defending" INTEGER NOT NULL,
    "physical" INTEGER NOT NULL,
    "goalkeeping" INTEGER NOT NULL DEFAULT 0,
    "marketValue" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "imageLicense" VARCHAR(255),
    "sourceProvider" VARCHAR(80),
    "sourcePlayerId" VARCHAR(100),
    "sourceUrl" TEXT,
    "dataVersion" VARCHAR(32) NOT NULL DEFAULT '1.0.0',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Manager" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT,
    "clubId" TEXT,
    "fullName" VARCHAR(120) NOT NULL,
    "nationalityCode" CHAR(2) NOT NULL,
    "tacticalStyle" VARCHAR(80),
    "overall" INTEGER NOT NULL,
    "attacking" INTEGER NOT NULL,
    "defending" INTEGER NOT NULL,
    "adaptability" INTEGER NOT NULL,
    "manManagement" INTEGER NOT NULL,
    "tier" "ContentTier" NOT NULL DEFAULT 'PREMIUM',
    "isNeutral" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT,
    "imageLicense" VARCHAR(255),
    "sourceProvider" VARCHAR(80),
    "sourceManagerId" VARCHAR(100),
    "dataVersion" VARCHAR(32) NOT NULL DEFAULT '1.0.0',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Manager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Formation" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" TEXT,
    "shape" JSONB NOT NULL,
    "tier" "ContentTier" NOT NULL DEFAULT 'FREE',
    "isNeutral" BOOLEAN NOT NULL DEFAULT false,
    "dataVersion" VARCHAR(32) NOT NULL DEFAULT '1.0.0',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Formation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "roomCode" VARCHAR(12) NOT NULL,
    "createdById" TEXT NOT NULL,
    "winnerUserId" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'WAITING',
    "budgetPerParticipant" INTEGER NOT NULL DEFAULT 150000000,
    "playerOneScore" INTEGER NOT NULL DEFAULT 0,
    "playerTwoScore" INTEGER NOT NULL DEFAULT 0,
    "simulationSeed" VARCHAR(128),
    "rulesVersion" VARCHAR(32) NOT NULL DEFAULT '1.0.0',
    "dataVersion" VARCHAR(32) NOT NULL DEFAULT '1.0.0',
    "scheduledAt" TIMESTAMPTZ(3),
    "startedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchParticipant" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "selectedClubId" TEXT,
    "side" "ParticipantSide" NOT NULL,
    "status" "ParticipantStatus" NOT NULL DEFAULT 'CONNECTED',
    "startingBudget" INTEGER NOT NULL DEFAULT 150000000,
    "availableBudget" INTEGER NOT NULL DEFAULT 150000000,
    "reservedBudget" INTEGER NOT NULL DEFAULT 0,
    "spentBudget" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readyAt" TIMESTAMPTZ(3),
    "disconnectedAt" TIMESTAMPTZ(3),
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MatchParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Squad" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL DEFAULT 'Match Squad',
    "chemistry" INTEGER NOT NULL DEFAULT 0,
    "overallRating" INTEGER NOT NULL DEFAULT 0,
    "tactics" JSONB,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Squad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SquadPlayer" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "squadId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "role" "SquadRole" NOT NULL DEFAULT 'STARTER',
    "assignedPosition" "PlayerPosition" NOT NULL,
    "acquisitionPrice" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SquadPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auction" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT,
    "managerId" TEXT,
    "formationId" TEXT,
    "winnerParticipantId" TEXT,
    "type" "AuctionType" NOT NULL,
    "status" "AuctionStatus" NOT NULL DEFAULT 'WAITING',
    "openingPrice" INTEGER NOT NULL,
    "currentPrice" INTEGER NOT NULL,
    "minimumIncrement" INTEGER NOT NULL DEFAULT 100000,
    "version" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMPTZ(3),
    "endsAt" TIMESTAMPTZ(3),
    "lastCallAt" TIMESTAMPTZ(3),
    "soldAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Auction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchEvent" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "participantId" TEXT,
    "playerId" TEXT,
    "type" "MatchEventType" NOT NULL,
    "minute" INTEGER NOT NULL,
    "stoppageTime" INTEGER NOT NULL DEFAULT 0,
    "sequence" INTEGER NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ranking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 1000,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "goalsFor" INTEGER NOT NULL DEFAULT 0,
    "goalsAgainst" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Ranking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "League_slug_key" ON "League"("slug");

-- CreateIndex
CREATE INDEX "League_countryCode_idx" ON "League"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "League_countryCode_name_key" ON "League"("countryCode", "name");

-- CreateIndex
CREATE UNIQUE INDEX "League_sourceProvider_sourceLeagueId_key" ON "League"("sourceProvider", "sourceLeagueId");

-- CreateIndex
CREATE INDEX "Club_leagueId_idx" ON "Club"("leagueId");

-- CreateIndex
CREATE INDEX "Club_countryCode_idx" ON "Club"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "Club_leagueId_name_key" ON "Club"("leagueId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Club_sourceProvider_sourceClubId_key" ON "Club"("sourceProvider", "sourceClubId");

-- CreateIndex
CREATE INDEX "Player_leagueId_idx" ON "Player"("leagueId");

-- CreateIndex
CREATE INDEX "Player_clubId_idx" ON "Player"("clubId");

-- CreateIndex
CREATE INDEX "Player_primaryPosition_idx" ON "Player"("primaryPosition");

-- CreateIndex
CREATE INDEX "Player_overall_idx" ON "Player"("overall");

-- CreateIndex
CREATE INDEX "Player_nationalityCode_idx" ON "Player"("nationalityCode");

-- CreateIndex
CREATE UNIQUE INDEX "Player_sourceProvider_sourcePlayerId_key" ON "Player"("sourceProvider", "sourcePlayerId");

-- CreateIndex
CREATE INDEX "Manager_leagueId_idx" ON "Manager"("leagueId");

-- CreateIndex
CREATE INDEX "Manager_clubId_idx" ON "Manager"("clubId");

-- CreateIndex
CREATE INDEX "Manager_tier_isNeutral_idx" ON "Manager"("tier", "isNeutral");

-- CreateIndex
CREATE UNIQUE INDEX "Manager_sourceProvider_sourceManagerId_key" ON "Manager"("sourceProvider", "sourceManagerId");

-- CreateIndex
CREATE UNIQUE INDEX "Formation_code_key" ON "Formation"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Formation_name_key" ON "Formation"("name");

-- CreateIndex
CREATE INDEX "Formation_tier_isNeutral_idx" ON "Formation"("tier", "isNeutral");

-- CreateIndex
CREATE UNIQUE INDEX "Match_roomCode_key" ON "Match"("roomCode");

-- CreateIndex
CREATE INDEX "Match_createdById_idx" ON "Match"("createdById");

-- CreateIndex
CREATE INDEX "Match_winnerUserId_idx" ON "Match"("winnerUserId");

-- CreateIndex
CREATE INDEX "Match_status_createdAt_idx" ON "Match"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MatchParticipant_userId_status_idx" ON "MatchParticipant"("userId", "status");

-- CreateIndex
CREATE INDEX "MatchParticipant_selectedClubId_idx" ON "MatchParticipant"("selectedClubId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchParticipant_matchId_userId_key" ON "MatchParticipant"("matchId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchParticipant_matchId_side_key" ON "MatchParticipant"("matchId", "side");

-- CreateIndex
CREATE UNIQUE INDEX "Squad_participantId_key" ON "Squad"("participantId");

-- CreateIndex
CREATE INDEX "Squad_formationId_idx" ON "Squad"("formationId");

-- CreateIndex
CREATE INDEX "Squad_managerId_idx" ON "Squad"("managerId");

-- CreateIndex
CREATE INDEX "Squad_isLocked_idx" ON "Squad"("isLocked");

-- CreateIndex
CREATE INDEX "SquadPlayer_playerId_idx" ON "SquadPlayer"("playerId");

-- CreateIndex
CREATE INDEX "SquadPlayer_role_idx" ON "SquadPlayer"("role");

-- CreateIndex
CREATE UNIQUE INDEX "SquadPlayer_matchId_playerId_key" ON "SquadPlayer"("matchId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "SquadPlayer_squadId_playerId_key" ON "SquadPlayer"("squadId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "SquadPlayer_squadId_slot_key" ON "SquadPlayer"("squadId", "slot");

-- CreateIndex
CREATE INDEX "Auction_matchId_status_idx" ON "Auction"("matchId", "status");

-- CreateIndex
CREATE INDEX "Auction_status_endsAt_idx" ON "Auction"("status", "endsAt");

-- CreateIndex
CREATE INDEX "Auction_winnerParticipantId_idx" ON "Auction"("winnerParticipantId");

-- CreateIndex
CREATE UNIQUE INDEX "Auction_matchId_playerId_key" ON "Auction"("matchId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Auction_matchId_managerId_key" ON "Auction"("matchId", "managerId");

-- CreateIndex
CREATE UNIQUE INDEX "Auction_matchId_formationId_key" ON "Auction"("matchId", "formationId");

-- CreateIndex
CREATE INDEX "Bid_auctionId_amount_idx" ON "Bid"("auctionId", "amount");

-- CreateIndex
CREATE INDEX "Bid_participantId_createdAt_idx" ON "Bid"("participantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Bid_auctionId_sequence_key" ON "Bid"("auctionId", "sequence");

-- CreateIndex
CREATE INDEX "MatchEvent_matchId_minute_sequence_idx" ON "MatchEvent"("matchId", "minute", "sequence");

-- CreateIndex
CREATE INDEX "MatchEvent_participantId_idx" ON "MatchEvent"("participantId");

-- CreateIndex
CREATE INDEX "MatchEvent_playerId_idx" ON "MatchEvent"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchEvent_matchId_sequence_key" ON "MatchEvent"("matchId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "Ranking_userId_key" ON "Ranking"("userId");

-- CreateIndex
CREATE INDEX "Ranking_rating_idx" ON "Ranking"("rating");

-- CreateIndex
CREATE INDEX "Ranking_wins_idx" ON "Ranking"("wins");

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Manager" ADD CONSTRAINT "Manager_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Manager" ADD CONSTRAINT "Manager_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_winnerUserId_fkey" FOREIGN KEY ("winnerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_selectedClubId_fkey" FOREIGN KEY ("selectedClubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Squad" ADD CONSTRAINT "Squad_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "MatchParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Squad" ADD CONSTRAINT "Squad_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Squad" ADD CONSTRAINT "Squad_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Manager"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadPlayer" ADD CONSTRAINT "SquadPlayer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadPlayer" ADD CONSTRAINT "SquadPlayer_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadPlayer" ADD CONSTRAINT "SquadPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Manager"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_winnerParticipantId_fkey" FOREIGN KEY ("winnerParticipantId") REFERENCES "MatchParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "MatchParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "MatchParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ranking" ADD CONSTRAINT "Ranking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FOOTBID domain safety constraints

ALTER TABLE "League"
ADD CONSTRAINT "League_country_code_check"
CHECK ("countryCode" ~ '^[A-Z]{2}$');

ALTER TABLE "Club"
ADD CONSTRAINT "Club_country_code_check"
CHECK ("countryCode" ~ '^[A-Z]{2}$');

ALTER TABLE "Player"
ADD CONSTRAINT "Player_country_code_check"
CHECK ("nationalityCode" ~ '^[A-Z]{2}$');

ALTER TABLE "Player"
ADD CONSTRAINT "Player_ratings_check"
CHECK (
  "overall" BETWEEN 0 AND 99
  AND "pace" BETWEEN 0 AND 99
  AND "shooting" BETWEEN 0 AND 99
  AND "passing" BETWEEN 0 AND 99
  AND "dribbling" BETWEEN 0 AND 99
  AND "defending" BETWEEN 0 AND 99
  AND "physical" BETWEEN 0 AND 99
  AND "goalkeeping" BETWEEN 0 AND 99
);

ALTER TABLE "Player"
ADD CONSTRAINT "Player_market_value_check"
CHECK ("marketValue" >= 0);

ALTER TABLE "Manager"
ADD CONSTRAINT "Manager_country_code_check"
CHECK ("nationalityCode" ~ '^[A-Z]{2}$');

ALTER TABLE "Manager"
ADD CONSTRAINT "Manager_ratings_check"
CHECK (
  "overall" BETWEEN 0 AND 99
  AND "attacking" BETWEEN 0 AND 99
  AND "defending" BETWEEN 0 AND 99
  AND "adaptability" BETWEEN 0 AND 99
  AND "manManagement" BETWEEN 0 AND 99
);

ALTER TABLE "Match"
ADD CONSTRAINT "Match_room_code_check"
CHECK ("roomCode" ~ '^[A-Z0-9]{6,12}$');

ALTER TABLE "Match"
ADD CONSTRAINT "Match_budget_check"
CHECK ("budgetPerParticipant" = 150000000);

ALTER TABLE "Match"
ADD CONSTRAINT "Match_scores_check"
CHECK (
  "playerOneScore" >= 0
  AND "playerTwoScore" >= 0
);

ALTER TABLE "Match"
ADD CONSTRAINT "Match_time_order_check"
CHECK (
  "startedAt" IS NULL
  OR "completedAt" IS NULL
  OR "completedAt" >= "startedAt"
);

ALTER TABLE "MatchParticipant"
ADD CONSTRAINT "MatchParticipant_budget_values_check"
CHECK (
  "startingBudget" = 150000000
  AND "availableBudget" >= 0
  AND "reservedBudget" >= 0
  AND "spentBudget" >= 0
);

ALTER TABLE "MatchParticipant"
ADD CONSTRAINT "MatchParticipant_budget_conservation_check"
CHECK (
  "availableBudget" + "reservedBudget" + "spentBudget"
  = "startingBudget"
);

ALTER TABLE "Squad"
ADD CONSTRAINT "Squad_ratings_check"
CHECK (
  "chemistry" BETWEEN 0 AND 100
  AND "overallRating" BETWEEN 0 AND 99
);

ALTER TABLE "Squad"
ADD CONSTRAINT "Squad_lock_time_check"
CHECK (
  ("isLocked" = FALSE AND "lockedAt" IS NULL)
  OR
  ("isLocked" = TRUE AND "lockedAt" IS NOT NULL)
);

ALTER TABLE "SquadPlayer"
ADD CONSTRAINT "SquadPlayer_price_check"
CHECK ("acquisitionPrice" >= 0);

ALTER TABLE "SquadPlayer"
ADD CONSTRAINT "SquadPlayer_role_slot_check"
CHECK (
  ("role" = 'STARTER' AND "slot" BETWEEN 1 AND 11)
  OR
  ("role" = 'SUBSTITUTE' AND "slot" BETWEEN 12 AND 18)
  OR
  ("role" = 'RESERVE' AND "slot" BETWEEN 19 AND 30)
);

ALTER TABLE "Auction"
ADD CONSTRAINT "Auction_item_type_check"
CHECK (
  (
    "type" = 'PLAYER'
    AND "playerId" IS NOT NULL
    AND "managerId" IS NULL
    AND "formationId" IS NULL
  )
  OR
  (
    "type" = 'MANAGER'
    AND "playerId" IS NULL
    AND "managerId" IS NOT NULL
    AND "formationId" IS NULL
  )
  OR
  (
    "type" = 'FORMATION'
    AND "playerId" IS NULL
    AND "managerId" IS NULL
    AND "formationId" IS NOT NULL
  )
);

ALTER TABLE "Auction"
ADD CONSTRAINT "Auction_prices_check"
CHECK (
  "openingPrice" >= 0
  AND "currentPrice" >= "openingPrice"
  AND "minimumIncrement" > 0
  AND "version" >= 0
);

ALTER TABLE "Auction"
ADD CONSTRAINT "Auction_time_order_check"
CHECK (
  "startsAt" IS NULL
  OR "endsAt" IS NULL
  OR "endsAt" > "startsAt"
);

ALTER TABLE "Auction"
ADD CONSTRAINT "Auction_sale_state_check"
CHECK (
  (
    "status" = 'SOLD'
    AND "winnerParticipantId" IS NOT NULL
    AND "soldAt" IS NOT NULL
  )
  OR
  (
    "status" <> 'SOLD'
    AND "winnerParticipantId" IS NULL
    AND "soldAt" IS NULL
  )
);

ALTER TABLE "Bid"
ADD CONSTRAINT "Bid_values_check"
CHECK (
  "amount" > 0
  AND "sequence" > 0
);

ALTER TABLE "MatchEvent"
ADD CONSTRAINT "MatchEvent_values_check"
CHECK (
  "minute" BETWEEN 0 AND 130
  AND "stoppageTime" BETWEEN 0 AND 20
  AND "sequence" > 0
);

ALTER TABLE "Ranking"
ADD CONSTRAINT "Ranking_values_check"
CHECK (
  "rating" >= 0
  AND "gamesPlayed" >= 0
  AND "wins" >= 0
  AND "draws" >= 0
  AND "losses" >= 0
  AND "goalsFor" >= 0
  AND "goalsAgainst" >= 0
  AND "currentStreak" >= 0
  AND "bestStreak" >= "currentStreak"
);

ALTER TABLE "Ranking"
ADD CONSTRAINT "Ranking_games_total_check"
CHECK ("gamesPlayed" = "wins" + "draws" + "losses");

-- Only one active auction may run in a match.
CREATE UNIQUE INDEX "Auction_one_live_per_match"
ON "Auction" ("matchId")
WHERE "status" IN ('ACTIVE', 'LAST_CALL');

-- One free neutral manager and formation are allowed per data version.
CREATE UNIQUE INDEX "Manager_one_neutral_per_version"
ON "Manager" ("dataVersion")
WHERE "tier" = 'FREE' AND "isNeutral" = TRUE;

CREATE UNIQUE INDEX "Formation_one_neutral_per_version"
ON "Formation" ("dataVersion")
WHERE "tier" = 'FREE' AND "isNeutral" = TRUE;

-- A squad cannot be locked until it contains exactly 11 starters.
CREATE FUNCTION "validate_locked_squad"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  starter_count INTEGER;
BEGIN
  IF NEW."isLocked" = TRUE THEN
    SELECT COUNT(*)
    INTO starter_count
    FROM "SquadPlayer"
    WHERE "squadId" = NEW."id"
      AND "role" = 'STARTER';

    IF starter_count <> 11 THEN
      RAISE EXCEPTION
        'A locked squad must contain exactly 11 starters; found %.',
        starter_count;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "Squad_validate_before_lock"
BEFORE INSERT OR UPDATE ON "Squad"
FOR EACH ROW
EXECUTE FUNCTION "validate_locked_squad"();