import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { setServers } from 'node:dns';
async function bootstrap(): Promise<void> {
   setServers(['1.1.1.1', '8.8.8.8']);
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use(requestIdMiddleware);
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();

  const origins = config.get<string[]>('corsOrigins');
  app.enableCors({
    origin: origins && origins.length > 0 ? origins : false,
    credentials: true,
    exposedHeaders: ['x-request-id'],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Savora API')
    .setDescription(
      'Authentication, profiles, restaurants and menu management for Savora.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port, '0.0.0.0');

  Logger.log(
    `Savora API listening on http://localhost:${port}/api/v1`,
    'Bootstrap',
  );
  Logger.log(`OpenAPI documentation: http://localhost:${port}/api/docs`, 'Bootstrap');
}

void bootstrap();
