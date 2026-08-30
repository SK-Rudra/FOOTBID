import { HttpException } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
} from '@nestjs/websockets';
import type { Server } from 'socket.io';
import { Public } from '../auth/decorators/public.decorator.js';
import type { AuthenticatedSocket } from '../realtime/authenticated-socket.js';
import { SocketAuthService } from '../realtime/socket-auth.service.js';
import { SocketRateLimiterService } from '../realtime/socket-rate-limiter.service.js';
import {
  AUCTION_ROOM_PREFIX,
  AUCTION_SOCKET_BID_LIMIT,
  AUCTION_SOCKET_BID_WINDOW_MS,
  AUCTION_SOCKET_NAMESPACE,
} from './auction.constants.js';
import type { AuctionMutationResult } from './auctions.service.js';
import { AuctionsService } from './auctions.service.js';
import {
  AuctionParamsDto,
  MatchAuctionParamsDto,
} from './dto/auction-params.dto.js';
import { SocketPlaceBidDto } from './dto/socket-place-bid.dto.js';

const MATCH_ROOM_PREFIX = 'match:';

function auctionRoom(auctionId: string): string {
  return `${AUCTION_ROOM_PREFIX}${auctionId}`;
}

function matchRoom(matchId: string): string {
  return `${MATCH_ROOM_PREFIX}${matchId}`;
}

function httpExceptionMessage(error: HttpException): string {
  const response = error.getResponse();

  if (typeof response === 'string') {
    return response;
  }

  if (
    typeof response === 'object' &&
    response !== null &&
    'message' in response
  ) {
    const message = (response as { message?: unknown }).message;

    if (Array.isArray(message)) {
      return message.join(' ');
    }

    if (typeof message === 'string') {
      return message;
    }
  }

  return error.message || 'The real-time request could not be completed.';
}

@Public()
@WebSocketGateway({
  namespace: AUCTION_SOCKET_NAMESPACE,
  transports: ['websocket', 'polling'],
})
export class AuctionsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly auctionsService: AuctionsService,
    private readonly socketAuthService: SocketAuthService,
    private readonly rateLimiter: SocketRateLimiterService,
  ) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const identity = await this.socketAuthService.authenticate(client);

      client.emit('auction:ready', {
        userId: identity.userId,
        serverTime: new Date(),
      });
    } catch (error: unknown) {
      client.emit('auction:error', this.errorPayload(error));
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    this.rateLimiter.clearSocket(client.id);
  }

  @SubscribeMessage('auction:join')
  async joinAuction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: AuctionParamsDto,
  ) {
    try {
      const identity = await this.socketAuthService.authenticate(client);

      const auction = await this.auctionsService.getAuctionForUser(
        payload.auctionId,
        identity.userId,
      );

      await client.join(auctionRoom(payload.auctionId));

      return {
        joined: true,
        auction,
      };
    } catch (error: unknown) {
      throw this.toWsException(error);
    }
  }

  @SubscribeMessage('auction:leave')
  async leaveAuction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: AuctionParamsDto,
  ) {
    try {
      await this.socketAuthService.authenticate(client);
      await client.leave(auctionRoom(payload.auctionId));

      return {
        left: true,
        auctionId: payload.auctionId,
      };
    } catch (error: unknown) {
      throw this.toWsException(error);
    }
  }

  @SubscribeMessage('match:join')
  async joinMatch(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: MatchAuctionParamsDto,
  ) {
    try {
      const identity = await this.socketAuthService.authenticate(client);

      const auctions = await this.auctionsService.listMatchAuctionsForUser(
        payload.matchId,
        identity.userId,
        {
          page: 1,
          pageSize: 20,
        },
      );

      await client.join(matchRoom(payload.matchId));

      return {
        joined: true,
        matchId: payload.matchId,
        auctions,
      };
    } catch (error: unknown) {
      throw this.toWsException(error);
    }
  }

  @SubscribeMessage('match:leave')
  async leaveMatch(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: MatchAuctionParamsDto,
  ) {
    try {
      await this.socketAuthService.authenticate(client);
      await client.leave(matchRoom(payload.matchId));

      return {
        left: true,
        matchId: payload.matchId,
      };
    } catch (error: unknown) {
      throw this.toWsException(error);
    }
  }

  @SubscribeMessage('auction:bid')
  async placeBid(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: SocketPlaceBidDto,
  ) {
    try {
      const identity = await this.socketAuthService.authenticate(client);

      const rateLimitDecision = this.rateLimiter.consume(
        client.id,
        'auction:bid',
        AUCTION_SOCKET_BID_LIMIT,
        AUCTION_SOCKET_BID_WINDOW_MS,
      );

      if (!rateLimitDecision.allowed) {
        throw new WsException({
          statusCode: 429,
          message: 'Too many bids. Please wait before bidding again.',
          retryAfterMs: rateLimitDecision.retryAfterMs,
        });
      }

      const result = await this.auctionsService.placeBid(
        payload.auctionId,
        identity.userId,
        {
          amount: payload.amount,
          idempotencyKey: payload.idempotencyKey,
        },
      );

      this.broadcastMutation(result);

      return result;
    } catch (error: unknown) {
      throw this.toWsException(error);
    }
  }

  broadcastMutation(result: AuctionMutationResult): void {
    if (!this.server) {
      return;
    }

    this.server
      .to([auctionRoom(result.auction.id), matchRoom(result.auction.matchId)])
      .emit('auction:updated', result);
  }

  private toWsException(error: unknown): WsException {
    if (error instanceof WsException) {
      return error;
    }

    return new WsException(this.errorPayload(error));
  }

  private errorPayload(error: unknown) {
    if (error instanceof HttpException) {
      return {
        statusCode: error.getStatus(),
        message: httpExceptionMessage(error),
      };
    }

    return {
      statusCode: 500,
      message: 'The real-time request could not be completed.',
    };
  }
}
