import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { PublicUser } from '../users/users.service.js';
import { AuthCookieService } from './auth-cookie.service.js';
import { REFRESH_TOKEN_COOKIE } from './auth.constants.js';
import { AuthService } from './auth.service.js';
import type {
  AuthenticatedIdentity,
  AuthenticationResult,
  RequestMetadata,
} from './auth.types.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

interface AuthenticationResponse {
  user: PublicUser;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCookies: AuthCookieService,
  ) {}

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthenticationResponse> {
    const result = await this.authService.register(
      dto,
      this.requestMetadata(request),
    );

    this.authCookies.setAuthenticationCookies(response, result.tokens);

    return this.authenticationResponse(result);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthenticationResponse> {
    const result = await this.authService.login(
      dto,
      this.requestMetadata(request),
    );

    this.authCookies.setAuthenticationCookies(response, result.tokens);

    return this.authenticationResponse(result);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthenticationResponse> {
    const refreshToken = this.refreshToken(request);

    if (!refreshToken) {
      throw new UnauthorizedException(
        'Invalid or expired authentication session.',
      );
    }

    const result = await this.authService.refresh(
      refreshToken,
      this.requestMetadata(request),
    );

    this.authCookies.setAuthenticationCookies(response, result.tokens);

    return this.authenticationResponse(result);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(this.refreshToken(request));
    this.authCookies.clearAuthenticationCookies(response);
  }

  @Get('me')
  async me(
    @CurrentUser() identity: AuthenticatedIdentity,
  ): Promise<PublicUser> {
    const user = await this.authService.getAuthenticatedUser(identity.userId);

    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }

    return user;
  }

  private authenticationResponse(
    result: AuthenticationResult,
  ): AuthenticationResponse {
    return {
      user: result.user,
      accessTokenExpiresAt: result.tokens.accessTokenExpiresAt,
      refreshTokenExpiresAt: result.tokens.refreshTokenExpiresAt,
    };
  }

  private refreshToken(request: Request): string | undefined {
    const cookies = request.cookies as Record<string, unknown> | undefined;

    const token = cookies?.[REFRESH_TOKEN_COOKIE];

    return typeof token === 'string' && token.length > 0 ? token : undefined;
  }

  private requestMetadata(request: Request): RequestMetadata {
    return {
      ipAddress: request.ip ?? null,
      userAgent: request.get('user-agent') ?? null,
    };
  }
}
