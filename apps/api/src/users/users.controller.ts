import { Controller, Get } from '@nestjs/common';
import { UserRole } from '../generated/prisma/enums.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { type PublicUser, UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  listUsers(): Promise<PublicUser[]> {
    return this.usersService.listPublicUsers();
  }
}
