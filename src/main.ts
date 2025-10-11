import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import helmet from 'helmet';
import compression from 'compression';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

// Load environment variables first
dotenvExpand.expand(dotenv.config());

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Trust proxy for correct IPs & rate-limit keys
  app.set('trust proxy', 1);

  // Global prefix for all routes
  app.setGlobalPrefix('api/v1');

  // Static files
  app.useStaticAssets(join(process.cwd(), 'public', 'uploads'), {
    prefix: '/uploads/',
    maxAge: 31536000000, // 1 year
    setHeaders: (res) => {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      res.set('Cache-Control', 'public, max-age=31536000');
    },
  });

  // Security middleware
  app.use(helmet());
  
  // Compression
  app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req: any, res: any) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    chunkSize: 16 * 1024,
  }));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = process.env.PORT || 5050;
  await app.listen(port);
  
  console.log(`🚀 Application is running on: http://localhost:${port}/api/v1`);
  console.log(`📊 Health check available at: http://localhost:${port}/health`);
}

bootstrap();
