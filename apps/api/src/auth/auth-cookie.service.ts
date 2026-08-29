import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_COOKIE_PATH,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE_PATH,
} from './auth.constants.js';
import type { TokenPair } from './auth.types.js';

@Injectable()
export class AuthCookieService {
  private readonly secureCookies: boolean;

  constructor(private readonly config: ConfigService) {
    this.secureCookies =
      this.config.getOrThrow<string>('NODE_ENV') === 'production';
  }

  setAuthenticationCookies(response: Response, tokens: TokenPair): void {
    const now = Date.now();

    response.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
      ...this.cookieOptions(ACCESS_TOKEN_COOKIE_PATH),
      maxAge: Math.max(0, tokens.accessTokenExpiresAt.getTime() - now),
    });

    response.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      ...this.cookieOptions(REFRESH_TOKEN_COOKIE_PATH),
      maxAge: Math.max(0, tokens.refreshTokenExpiresAt.getTime() - now),
    });
  }

  clearAuthenticationCookies(response: Response): void {
    response.clearCookie(
      ACCESS_TOKEN_COOKIE,
      this.cookieOptions(ACCESS_TOKEN_COOKIE_PATH),
    );

    response.clearCookie(
      REFRESH_TOKEN_COOKIE,
      this.cookieOptions(REFRESH_TOKEN_COOKIE_PATH),
    );
  }

  private cookieOptions(path: string): CookieOptions {
    return {
      httpOnly: true,
      secure: this.secureCookies,
      sameSite: 'lax',
      path,
    };
  }
}
