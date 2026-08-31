import { Module } from '@nestjs/common';
import { ManagersController } from './managers.controller.js';
import { ManagersService } from './managers.service.js';

@Module({
  controllers: [ManagersController],
  providers: [ManagersService],
  exports: [ManagersService],
})
export class ManagersModule {}
