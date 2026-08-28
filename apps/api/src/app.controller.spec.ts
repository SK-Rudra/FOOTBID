import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const testingModule: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = testingModule.get<AppController>(AppController);
  });

  describe('health', () => {
    it('returns the FOOTBID API health status', () => {
      const result = appController.getHealth();

      expect(result).toMatchObject({
        status: 'ok',
        service: 'footbid-api',
      });

      expect(Date.parse(result.timestamp)).not.toBeNaN();
    });
  });
});
