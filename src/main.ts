import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { join } from 'path';
import fastifyHelmet from '@fastify/helmet';
import fastifyCompress from '@fastify/compress';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';

// Load environment variables first
dotenvExpand.expand(dotenv.config());

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  // Create Fastify adapter with options
  const fastifyAdapter = new FastifyAdapter({
    logger: false, // Use NestJS logger instead
    trustProxy: true, // Trust proxy for correct IPs & rate-limit keys
    bodyLimit: 10485760, // 10MB
    caseSensitive: false,
    ignoreTrailingSlash: true,
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter,
    {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
      bufferLogs: true,
    },
  );

  // Global prefix for all routes
  app.setGlobalPrefix('api/v1');

  // Register Fastify plugins
  
  // CORS - must be registered before other plugins
  await app.register(fastifyCors, {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400, // 24 hours
  });

  // Security - Helmet
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false, // For static files
  });

  // Compression
  await app.register(fastifyCompress, {
    global: true,
    threshold: 1024, // Only compress responses larger than 1KB
    encodings: ['gzip', 'deflate'],
    zlibOptions: {
      level: 6, // Balance between compression and CPU
      chunkSize: 16 * 1024, // 16KB chunks
    },
  });

  // Static files for uploads
  await app.register(fastifyStatic, {
    root: join(process.cwd(), 'public', 'uploads'),
    prefix: '/uploads/',
    decorateReply: false,
    setHeaders: (res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
    },
  });

  // Multipart/form-data support for file uploads
  await app.register(fastifyMultipart, {
    limits: {
      fieldNameSize: 100, // Max field name size in bytes
      fieldSize: 10485760, // Max field value size in bytes (10MB)
      fields: 10, // Max number of non-file fields
      fileSize: 10485760, // Max file size in bytes (10MB)
      files: 10, // Max number of file fields
      headerPairs: 2000, // Max number of header key-value pairs
    },
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: process.env.NODE_ENV === 'production' ? true : false,
    }),
  );

  // Swagger/OpenAPI documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('NestJS Fastify API')
      .setDescription('A modern, high-performance API built with NestJS and Fastify')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
        'JWT',
      )
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('languages', 'Language CRUD operations')
      .addTag('events', 'Event logging')
      .addTag('images', 'Image upload and management')
      .addTag('monitoring', 'System monitoring and health')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
    
    logger.log(`📚 Swagger documentation available at: http://localhost:${process.env.PORT || 5050}/api/docs`);
  }

  const port = process.env.PORT || 5050;
  const host = process.env.HOST || '0.0.0.0';
  
  await app.listen(port, host);
  
  logger.log(`🚀 Application is running on: http://${host}:${port}/api/v1`);
  logger.log(`📊 Health check available at: http://${host}:${port}/health`);
  logger.log(`⚡ Using Fastify adapter for high performance`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
