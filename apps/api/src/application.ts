import {
  HttpStatus,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';

export function configureApplication(app: INestApplication): void {
  const config = app.get(ConfigService);
  const nodeEnvironment = config.getOrThrow<string>('NODE_ENV');
  const webUrl = config.getOrThrow<string>('WEB_URL');

  app.setGlobalPrefix('api/v1');

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  app.enableCors({
    origin: webUrl,
    credentials: true,
  });

  const skipRateLimiting = nodeEnvironment === 'test';

  const credentialRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => skipRateLimiting,
    statusCode: HttpStatus.TOO_MANY_REQUESTS,
    message: {
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      message: 'Too many authentication attempts. Please try again later.',
      error: 'Too Many Requests',
    },
  });

  const refreshRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => skipRateLimiting,
    statusCode: HttpStatus.TOO_MANY_REQUESTS,
    message: {
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      message: 'Too many session refresh attempts. Please try again later.',
      error: 'Too Many Requests',
    },
  });

  app.use('/api/v1/auth/register', credentialRateLimiter);
  app.use('/api/v1/auth/login', credentialRateLimiter);
  app.use('/api/v1/auth/refresh', refreshRateLimiter);
}
