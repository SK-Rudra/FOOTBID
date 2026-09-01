import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator.js';
import { QueryFormationsDto } from './dto/query-formations.dto.js';
import { FormationsService } from './formations.service.js';

@Public()
@Controller('formations')
export class FormationsController {
  constructor(private readonly formationsService: FormationsService) {}

  @Get()
  findAll(@Query() query: QueryFormationsDto) {
    return this.formationsService.findAll(query);
  }

  @Get('filters')
  getFilters() {
    return this.formationsService.getFilters();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.formationsService.findOne(id);
  }
}
