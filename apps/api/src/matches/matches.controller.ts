import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import type { AuthenticatedIdentity } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JoinMatchDto, MatchParamsDto } from './dto/match.dto.js';
import { MatchesService } from './matches.service.js';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Post()
  createMatch(@CurrentUser() identity: AuthenticatedIdentity) {
    return this.matchesService.createMatch(identity.userId);
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  joinMatch(
    @CurrentUser() identity: AuthenticatedIdentity,
    @Body() dto: JoinMatchDto,
  ) {
    return this.matchesService.joinMatch(identity.userId, dto.roomCode);
  }

  @Get('current')
  async getCurrentMatch(@CurrentUser() identity: AuthenticatedIdentity) {
    return {
      match: await this.matchesService.getCurrentMatch(identity.userId),
    };
  }

  @Get(':matchId')
  getMatch(
    @CurrentUser() identity: AuthenticatedIdentity,
    @Param() params: MatchParamsDto,
  ) {
    return this.matchesService.getMatch(params.matchId, identity.userId);
  }
}
