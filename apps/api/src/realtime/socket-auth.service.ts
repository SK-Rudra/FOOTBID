import { Injectable, UnauthorizedException } from '@nestjs/common';
import { parseCookie } from 'cookie';
import { AuthService } from '../auth/auth.service.js';
import { ACCESS_TOKEN_COOKIE } from '../auth/auth.constants.js';
import type { AuthenticatedIdentity } from '../auth/auth.types.js';
import type { AuthenticatedSocket } from './authenticated-socket.js';

@Injectable()
export class SocketAuthService {
  constructor(private readonly authService: AuthService) {}

  async authenticate(
    client: AuthenticatedSocket,
  ): Promise<AuthenticatedIdentity> {
    if (client.data.auth) {
      return client.data.auth;
    }

    const cookieHeader = client.handshake.headers.cookie;

    if (!cookieHeader) {
      throw new UnauthorizedException('Authentication required.');
    }

    const accessToken = parseCookie(cookieHeader)[ACCESS_TOKEN_COOKIE];

    if (!accessToken) {
      throw new UnauthorizedException('Authentication required.');
    }

    const identity = await this.authService.validateAccessToken(accessToken);

    client.data.auth = identity;

    return identity;
  }
}
