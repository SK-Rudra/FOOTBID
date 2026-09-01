import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import type { AuthenticatedIdentity } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { MatchParamsDto } from '../matches/dto/match.dto.js';
import { SaveSquadDto } from './dto/squad.dto.js';
import { SquadsService } from './squads.service.js';

@Controller('matches')
export class SquadsController {
  constructor(private readonly squadsService: SquadsService) {}

  @Post(':matchId/squad-building/start')
  @HttpCode(HttpStatus.OK)
  startSquadBuilding(
    @CurrentUser() identity: AuthenticatedIdentity,
    @Param() params: MatchParamsDto,
  ) {
    return this.squadsService.startSquadBuilding(
      params.matchId,
      identity.userId,
    );
  }

  @Put(':matchId/squad')
  saveSquad(
    @CurrentUser() identity: AuthenticatedIdentity,
    @Param() params: MatchParamsDto,
    @Body() dto: SaveSquadDto,
  ) {
    return this.squadsService.saveSquad(params.matchId, identity.userId, dto);
  }

  @Get(':matchId/squad')
  getSquad(
    @CurrentUser() identity: AuthenticatedIdentity,
    @Param() params: MatchParamsDto,
  ) {
    return this.squadsService.getSquad(params.matchId, identity.userId);
  }
}
