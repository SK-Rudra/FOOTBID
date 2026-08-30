import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuctionsGateway } from './auctions.gateway.js';
import { AuctionsService } from './auctions.service.js';

const AUCTION_CLOCK_INTERVAL_MS = 1_000;

@Injectable()
export class AuctionsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuctionsScheduler.name);

  private timer: ReturnType<typeof setInterval> | null = null;
  private processing = false;

  constructor(
    private readonly config: ConfigService,
    private readonly auctionsService: AuctionsService,
    private readonly auctionsGateway: AuctionsGateway,
  ) {}

  onModuleInit(): void {
    if (this.config.getOrThrow<string>('NODE_ENV') === 'test') {
      return;
    }

    this.timer = setInterval(() => {
      void this.runOnce();
    }, AUCTION_CLOCK_INTERVAL_MS);

    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runOnce(now = new Date()): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    try {
      const results = await this.auctionsService.processDueAuctions(now);

      for (const result of results) {
        this.auctionsGateway.broadcastMutation(result);
      }
    } catch (error: unknown) {
      const details =
        error instanceof Error ? (error.stack ?? error.message) : String(error);

      this.logger.error('The automatic auction clock failed.', details);
    } finally {
      this.processing = false;
    }
  }
}
