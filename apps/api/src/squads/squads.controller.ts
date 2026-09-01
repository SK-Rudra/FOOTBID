import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import type { AuthenticatedIdentity } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { MatchParamsDto } from '../matches/dto/match.dto.js';
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
}
