import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator.js';
import { QueryManagersDto } from './dto/query-managers.dto.js';
import { ManagersService } from './managers.service.js';

@Public()
@Controller('managers')
export class ManagersController {
  constructor(private readonly managersService: ManagersService) {}

  @Get()
  findAll(@Query() query: QueryManagersDto) {
    return this.managersService.findAll(query);
  }

  @Get('filters')
  getFilters() {
    return this.managersService.getFilters();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.managersService.findOne(id);
  }
}
