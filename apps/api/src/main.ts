import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = Number(process.env.PORT ?? 4000);
  const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';

  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();

  app.enableCors({
    origin: webUrl,
    credentials: true,
  });

  await app.listen(port);

  Logger.log(
    `FOOTBID API running at http://localhost:${port}/api/v1`,
    'Bootstrap',
  );
}

await bootstrap();
