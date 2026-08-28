import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  AuctionType,
  ContentTier,
  MatchEventType,
  MatchStatus,
  ParticipantSide,
  PlayerPosition,
  PreferredFoot,
  SquadRole,
} from '../src/generated/prisma/enums.js';

const developmentUrl = process.env['DATABASE_URL'];
const testDatabaseUrl = process.env['TEST_DATABASE_URL'];

if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL is required.');
}

if (testDatabaseUrl === developmentUrl) {
  throw new Error(
    'Verification must not run against the development database.',
  );
}

const SOURCE_PROVIDER = 'footbid-verification';
const DATA_VERSION = 'verification-1.0.0';
const ROOM_CODE = 'VERIFY001';

const verificationEmails = [
  'player.one@verify.footbid.local',
  'player.two@verify.footbid.local',
];

const adapter = new PrismaPg({ connectionString: testDatabaseUrl });
const prisma = new PrismaClient({ adapter });

function assertCondition(
  condition: boolean,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function expectDatabaseRejection(
  label: string,
  operation: () => Promise<unknown>,
): Promise<void> {
  let rejected = false;

  try {
    await operation();
  } catch {
    rejected = true;
  }

  if (!rejected) {
    throw new Error(`Expected database rejection: ${label}`);
  }

  console.log(`PASS: ${label}`);
}

async function cleanupVerificationData(): Promise<void> {
  await prisma.match.deleteMany({
    where: { roomCode: ROOM_CODE },
  });

  await prisma.user.deleteMany({
    where: {
      email: { in: verificationEmails },
    },
  });

  await prisma.player.deleteMany({
    where: { sourceProvider: SOURCE_PROVIDER },
  });

  await prisma.manager.deleteMany({
    where: { sourceProvider: SOURCE_PROVIDER },
  });

  await prisma.formation.deleteMany({
    where: { code: 'VERIFY-4-4-2' },
  });

  await prisma.club.deleteMany({
    where: { sourceProvider: SOURCE_PROVIDER },
  });

  await prisma.league.deleteMany({
    where: { sourceProvider: SOURCE_PROVIDER },
  });
}

async function main(): Promise<void> {
  await cleanupVerificationData();

  try {
    const league = await prisma.league.create({
      data: {
        name: 'Verification League',
        slug: 'verification-league',
        countryCode: 'BD',
        sourceProvider: SOURCE_PROVIDER,
        sourceLeagueId: 'verification-league',
        dataVersion: DATA_VERSION,
      },
    });

    const club = await prisma.club.create({
      data: {
        name: 'Verification Athletic',
        shortName: 'VERIFY',
        countryCode: 'BD',
        sourceProvider: SOURCE_PROVIDER,
        sourceClubId: 'verification-club',
        dataVersion: DATA_VERSION,
        league: {
          connect: { id: league.id },
        },
      },
    });

    const goalkeeper = await prisma.player.create({
      data: {
        fullName: 'Verification Goalkeeper',
        shortName: 'Verify GK',
        nationalityCode: 'BD',
        primaryPosition: PlayerPosition.GK,
        secondaryPositions: [],
        preferredFoot: PreferredFoot.RIGHT,
        overall: 70,
        pace: 45,
        shooting: 10,
        passing: 55,
        dribbling: 45,
        defending: 15,
        physical: 70,
        goalkeeping: 73,
        marketValue: 2_000_000,
        sourceProvider: SOURCE_PROVIDER,
        sourcePlayerId: 'verification-goalkeeper',
        dataVersion: DATA_VERSION,
        league: {
          connect: { id: league.id },
        },
        club: {
          connect: { id: club.id },
        },
      },
    });

    const striker = await prisma.player.create({
      data: {
        fullName: 'Verification Striker',
        shortName: 'Verify ST',
        nationalityCode: 'BD',
        primaryPosition: PlayerPosition.ST,
        secondaryPositions: [PlayerPosition.CF],
        preferredFoot: PreferredFoot.LEFT,
        overall: 72,
        pace: 76,
        shooting: 75,
        passing: 62,
        dribbling: 71,
        defending: 30,
        physical: 72,
        goalkeeping: 5,
        marketValue: 3_000_000,
        sourceProvider: SOURCE_PROVIDER,
        sourcePlayerId: 'verification-striker',
        dataVersion: DATA_VERSION,
        league: {
          connect: { id: league.id },
        },
        club: {
          connect: { id: club.id },
        },
      },
    });

    const manager = await prisma.manager.create({
      data: {
        fullName: 'Verification Manager',
        nationalityCode: 'BD',
        tacticalStyle: 'Balanced',
        overall: 70,
        attacking: 70,
        defending: 70,
        adaptability: 70,
        manManagement: 70,
        tier: ContentTier.PREMIUM,
        isNeutral: false,
        sourceProvider: SOURCE_PROVIDER,
        sourceManagerId: 'verification-manager',
        dataVersion: DATA_VERSION,
        league: {
          connect: { id: league.id },
        },
        club: {
          connect: { id: club.id },
        },
      },
    });

    const formation = await prisma.formation.create({
      data: {
        code: 'VERIFY-4-4-2',
        name: 'Verification 4-4-2',
        description: 'Temporary formation used only for database verification.',
        shape: {
          version: 1,
          slots: [
            { slot: 1, position: 'GK' },
            { slot: 2, position: 'LB' },
            { slot: 3, position: 'CB' },
            { slot: 4, position: 'CB' },
            { slot: 5, position: 'RB' },
            { slot: 6, position: 'LM' },
            { slot: 7, position: 'CM' },
            { slot: 8, position: 'CM' },
            { slot: 9, position: 'RM' },
            { slot: 10, position: 'ST' },
            { slot: 11, position: 'ST' },
          ],
        },
        tier: ContentTier.PREMIUM,
        isNeutral: false,
        dataVersion: DATA_VERSION,
      },
    });

    const playerOne = await prisma.user.create({
      data: {
        email: verificationEmails[0],
        username: 'verify_player_one',
        passwordHash: 'verification-only-not-a-real-password-hash',
        displayName: 'Verification Player One',
        ranking: {
          create: {},
        },
      },
    });

    const playerTwo = await prisma.user.create({
      data: {
        email: verificationEmails[1],
        username: 'verify_player_two',
        passwordHash: 'verification-only-not-a-real-password-hash',
        displayName: 'Verification Player Two',
        ranking: {
          create: {},
        },
      },
    });

    const match = await prisma.match.create({
      data: {
        roomCode: ROOM_CODE,
        status: MatchStatus.WAITING,
        budgetPerParticipant: 150_000_000,
        rulesVersion: DATA_VERSION,
        dataVersion: DATA_VERSION,
        createdBy: {
          connect: { id: playerOne.id },
        },
      },
    });

    const participantOne = await prisma.matchParticipant.create({
      data: {
        side: ParticipantSide.PLAYER_ONE,
        match: {
          connect: { id: match.id },
        },
        user: {
          connect: { id: playerOne.id },
        },
        selectedClub: {
          connect: { id: club.id },
        },
      },
    });

    const participantTwo = await prisma.matchParticipant.create({
      data: {
        side: ParticipantSide.PLAYER_TWO,
        match: {
          connect: { id: match.id },
        },
        user: {
          connect: { id: playerTwo.id },
        },
        selectedClub: {
          connect: { id: club.id },
        },
      },
    });

    const squadOne = await prisma.squad.create({
      data: {
        name: 'Verification Squad One',
        participant: {
          connect: { id: participantOne.id },
        },
        manager: {
          connect: { id: manager.id },
        },
        formation: {
          connect: { id: formation.id },
        },
      },
    });

    const squadTwo = await prisma.squad.create({
      data: {
        name: 'Verification Squad Two',
        participant: {
          connect: { id: participantTwo.id },
        },
        manager: {
          connect: { id: manager.id },
        },
        formation: {
          connect: { id: formation.id },
        },
      },
    });

    await prisma.squadPlayer.create({
      data: {
        slot: 1,
        role: SquadRole.STARTER,
        assignedPosition: PlayerPosition.GK,
        acquisitionPrice: 2_000_000,
        match: {
          connect: { id: match.id },
        },
        squad: {
          connect: { id: squadOne.id },
        },
        player: {
          connect: { id: goalkeeper.id },
        },
      },
    });

    const auction = await prisma.auction.create({
      data: {
        type: AuctionType.PLAYER,
        openingPrice: 2_000_000,
        currentPrice: 2_500_000,
        minimumIncrement: 100_000,
        match: {
          connect: { id: match.id },
        },
        player: {
          connect: { id: striker.id },
        },
      },
    });

    const bid = await prisma.bid.create({
      data: {
        amount: 2_500_000,
        sequence: 1,
        auction: {
          connect: { id: auction.id },
        },
        participant: {
          connect: { id: participantOne.id },
        },
      },
    });

    await prisma.matchEvent.create({
      data: {
        type: MatchEventType.KICKOFF,
        minute: 0,
        sequence: 1,
        payload: {
          verification: true,
        },
        match: {
          connect: { id: match.id },
        },
        participant: {
          connect: { id: participantOne.id },
        },
        player: {
          connect: { id: striker.id },
        },
      },
    });

    console.log('PASS: inserts across all core relationships');

    const updatedUser = await prisma.user.update({
      where: { id: playerOne.id },
      data: {
        displayName: 'Updated Verification Player',
      },
    });

    await prisma.match.update({
      where: { id: match.id },
      data: {
        status: MatchStatus.AUCTION,
      },
    });

    assertCondition(
      updatedUser.displayName === 'Updated Verification Player',
      'User update verification failed.',
    );

    console.log('PASS: update operation');

    const queriedMatch = await prisma.match.findUnique({
      where: { id: match.id },
      include: {
        participants: {
          include: {
            user: {
              include: {
                ranking: true,
              },
            },
            selectedClub: true,
            squad: {
              include: {
                players: {
                  include: {
                    player: true,
                  },
                },
              },
            },
          },
        },
        auctions: {
          include: {
            bids: true,
            player: true,
          },
        },
        events: true,
      },
    });

    assertCondition(queriedMatch !== null, 'Match relationship query failed.');
    assertCondition(
      queriedMatch.participants.length === 2,
      'Expected two match participants.',
    );
    assertCondition(
      queriedMatch.participants.every(
        (participant) => participant.user.ranking !== null,
      ),
      'Expected a ranking for both users.',
    );
    assertCondition(
      queriedMatch.auctions.length === 1,
      'Expected one auction.',
    );
    assertCondition(
      queriedMatch.auctions[0]?.bids.length === 1,
      'Expected one auction bid.',
    );
    assertCondition(
      queriedMatch.events.length === 1,
      'Expected one match event.',
    );

    console.log('PASS: nested relationship queries');

    await expectDatabaseRejection(
      'duplicate player ownership within one match is rejected',
      async () =>
        prisma.squadPlayer.create({
          data: {
            slot: 1,
            role: SquadRole.STARTER,
            assignedPosition: PlayerPosition.GK,
            acquisitionPrice: 3_000_000,
            match: {
              connect: { id: match.id },
            },
            squad: {
              connect: { id: squadTwo.id },
            },
            player: {
              connect: { id: goalkeeper.id },
            },
          },
        }),
    );

    await expectDatabaseRejection(
      'invalid participant budget conservation is rejected',
      async () =>
        prisma.matchParticipant.update({
          where: { id: participantOne.id },
          data: {
            availableBudget: 149_999_999,
          },
        }),
    );

    await expectDatabaseRejection(
      'locking an incomplete starting eleven is rejected',
      async () =>
        prisma.squad.update({
          where: { id: squadOne.id },
          data: {
            isLocked: true,
            lockedAt: new Date(),
          },
        }),
    );

    await prisma.bid.delete({
      where: { id: bid.id },
    });

    const remainingBids = await prisma.bid.count({
      where: { auctionId: auction.id },
    });

    assertCondition(remainingBids === 0, 'Bid deletion verification failed.');

    console.log('PASS: delete operation');

    await cleanupVerificationData();

    const leftoverCounts = await Promise.all([
      prisma.match.count({ where: { roomCode: ROOM_CODE } }),
      prisma.user.count({
        where: { email: { in: verificationEmails } },
      }),
      prisma.player.count({
        where: { sourceProvider: SOURCE_PROVIDER },
      }),
      prisma.manager.count({
        where: { sourceProvider: SOURCE_PROVIDER },
      }),
      prisma.formation.count({
        where: { code: 'VERIFY-4-4-2' },
      }),
      prisma.club.count({
        where: { sourceProvider: SOURCE_PROVIDER },
      }),
      prisma.league.count({
        where: { sourceProvider: SOURCE_PROVIDER },
      }),
    ]);

    assertCondition(
      leftoverCounts.every((count) => count === 0),
      'Verification cleanup left temporary records behind.',
    );

    console.log('PASS: cascading cleanup');
    console.log('FOOTBID database verification completed successfully.');
  } finally {
    await cleanupVerificationData();
  }
}

main()
  .catch((error: unknown) => {
    console.error('FOOTBID database verification failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
