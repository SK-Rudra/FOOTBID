import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BudgetsModule } from '../budgets/budgets.module.js';
import { SocketAuthService } from '../realtime/socket-auth.service.js';
import { SocketRateLimiterService } from '../realtime/socket-rate-limiter.service.js';
import { AuctionsController } from './auctions.controller.js';
import { AuctionsGateway } from './auctions.gateway.js';
import { AuctionsScheduler } from './auctions.scheduler.js';
import { AuctionsService } from './auctions.service.js';

@Module({
  imports: [AuthModule, BudgetsModule],
  controllers: [AuctionsController],
  providers: [
    AuctionsService,
    AuctionsGateway,
    AuctionsScheduler,
    SocketAuthService,
    SocketRateLimiterService,
  ],
  exports: [AuctionsService],
})
export class AuctionsModule {}
