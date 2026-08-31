import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthenticatedIdentity } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AuctionsGateway } from './auctions.gateway.js';
import type { AuctionMutationResult } from './auctions.service.js';
import { AuctionsService } from './auctions.service.js';
import {
  AuctionHistoryQueryDto,
  AuctionListQueryDto,
} from './dto/auction-query.dto.js';
import {
  AuctionParamsDto,
  MatchAuctionParamsDto,
} from './dto/auction-params.dto.js';
import { CreateManagerAuctionDto } from './dto/create-manager-auction.dto.js';
import { CreatePlayerAuctionDto } from './dto/create-auction.dto.js';
import { PlaceBidDto } from './dto/place-bid.dto.js';
import { StartAuctionDto } from './dto/start-auction.dto.js';

@Controller()
export class AuctionsController {
  constructor(
    private readonly auctionsService: AuctionsService,
    private readonly auctionsGateway: AuctionsGateway,
  ) {}

  @Post('matches/:matchId/auctions')
  async createPlayerAuction(
    @CurrentUser() identity: AuthenticatedIdentity,
    @Param() params: MatchAuctionParamsDto,
    @Body() dto: CreatePlayerAuctionDto,
  ) {
    const result = await this.auctionsService.createPlayerAuction(
      params.matchId,
      identity.userId,
      dto,
    );

    return this.publish(result);
  }

  @Post('matches/:matchId/manager-auctions')
  async createManagerAuction(
    @CurrentUser() identity: AuthenticatedIdentity,
    @Param() params: MatchAuctionParamsDto,
    @Body() dto: CreateManagerAuctionDto,
  ) {
    const result = await this.auctionsService.createManagerAuction(
      params.matchId,
      identity.userId,
      dto,
    );

    return this.publish(result);
  }
  @Get('matches/:matchId/auctions')
  listMatchAuctions(
    @CurrentUser() identity: AuthenticatedIdentity,
    @Param() params: MatchAuctionParamsDto,
    @Query() query: AuctionListQueryDto,
  ) {
    return this.auctionsService.listMatchAuctionsForUser(
      params.matchId,
      identity.userId,
      query,
    );
  }

  @Get('auctions/:auctionId')
  getAuction(
    @CurrentUser() identity: AuthenticatedIdentity,
    @Param() params: AuctionParamsDto,
  ) {
    return this.auctionsService.getAuctionForUser(
      params.auctionId,
      identity.userId,
    );
  }

  @Get('auctions/:auctionId/history')
  listAuctionHistory(
    @CurrentUser() identity: AuthenticatedIdentity,
    @Param() params: AuctionParamsDto,
    @Query() query: AuctionHistoryQueryDto,
  ) {
    return this.auctionsService.listAuctionHistoryForUser(
      params.auctionId,
      identity.userId,
      query,
    );
  }

  @Post('auctions/:auctionId/start')
  @HttpCode(HttpStatus.OK)
  async startAuction(
    @CurrentUser() identity: AuthenticatedIdentity,
    @Param() params: AuctionParamsDto,
    @Body() dto: StartAuctionDto,
  ) {
    const result = await this.auctionsService.startAuction(
      params.auctionId,
      identity.userId,
      dto,
    );

    return this.publish(result);
  }

  @Post('auctions/:auctionId/bids')
  @HttpCode(HttpStatus.OK)
  async placeBid(
    @CurrentUser() identity: AuthenticatedIdentity,
    @Param() params: AuctionParamsDto,
    @Body() dto: PlaceBidDto,
  ) {
    const result = await this.auctionsService.placeBid(
      params.auctionId,
      identity.userId,
      dto,
    );

    return this.publish(result);
  }

  @Post('auctions/:auctionId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelAuction(
    @CurrentUser() identity: AuthenticatedIdentity,
    @Param() params: AuctionParamsDto,
  ) {
    const result = await this.auctionsService.cancelAuction(
      params.auctionId,
      identity.userId,
    );

    return this.publish(result);
  }

  private publish(result: AuctionMutationResult): AuctionMutationResult {
    this.auctionsGateway.broadcastMutation(result);

    return result;
  }
}
