import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma/prisma.service.js';

describe('AppController', () => {
  let appController: AppController;

  const prismaServiceMock = {
    $queryRaw: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    prismaServiceMock.$queryRaw.mockResolvedValue([{ result: 1 }]);

    const testingModule: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    appController = testingModule.get<AppController>(AppController);
  });

  describe('health', () => {
    it('returns the FOOTBID API and database health status', async () => {
      const result = await appController.getHealth();

      expect(result).toMatchObject({
        status: 'ok',
        service: 'footbid-api',
        database: 'connected',
      });

      expect(Date.parse(result.timestamp)).not.toBeNaN();
      expect(prismaServiceMock.$queryRaw).toHaveBeenCalledOnce();
    });
  });
});
