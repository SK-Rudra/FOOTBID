import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator.js';
import { QueryPlayersDto } from './dto/query-players.dto.js';
import { PlayersService } from './players.service.js';

@Public()
@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  findAll(@Query() query: QueryPlayersDto) {
    return this.playersService.findAll(query);
  }

  @Get('filters')
  getFilters() {
    return this.playersService.getFilters();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.playersService.findOne(id);
  }
}
