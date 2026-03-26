import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppLoggerService } from './common/logger/logger.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { createRequestLoggingMiddleware } from './common/middleware/request-logging.middleware';

process.on('uncaughtException', (error) => {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'CRITICAL',
      context: 'Process',
      message: 'Uncaught exception',
      trace: error.stack,
    }),
  );
});

process.on('unhandledRejection', (reason) => {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'CRITICAL',
      context: 'Process',
      message: 'Unhandled rejection',
      reason: String(reason),
    }),
  );
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(AppLoggerService);
  app.useLogger(logger);

  app.use(requestIdMiddleware);
  app.use(createRequestLoggingMiddleware(logger));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter(logger));

  const config = new DocumentBuilder()
    .setTitle('Neonix API')
    .setDescription('API documentation for Neonix backend')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const corsOrigin = process.env.CORS_ORIGIN?.split(',') ?? true;
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  const port = Number(process.env.PORT || 4000);

  await app.listen(port, '0.0.0.0');

  logger.log('Application started successfully', 'Bootstrap', {
    port,
    env: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
  });
}

void bootstrap();
