import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApplication } from './application.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  configureApplication(app);
  app.enableShutdownHooks();

  const port = config.getOrThrow<number>('PORT');

  await app.listen(port);

  Logger.log(
    `FOOTBID API running at http://localhost:${port}/api/v1`,
    'Bootstrap',
  );
}

await bootstrap();
