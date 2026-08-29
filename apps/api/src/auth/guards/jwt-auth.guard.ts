import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ACCESS_TOKEN_COOKIE } from '../auth.constants.js';
import type { AuthenticatedRequest } from '../authenticated-request.js';
import { AuthService } from '../auth.service.js';
import { PUBLIC_ROUTE_KEY } from '../decorators/public.decorator.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const cookies = request.cookies as Record<string, unknown> | undefined;

    const accessToken = cookies?.[ACCESS_TOKEN_COOKIE];

    if (typeof accessToken !== 'string' || accessToken.length === 0) {
      throw new UnauthorizedException('Authentication required.');
    }

    request.auth = await this.authService.validateAccessToken(accessToken);

    return true;
  }
}
