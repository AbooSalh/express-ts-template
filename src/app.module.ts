import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { envValidationSchema } from './config/env.validation';
import { typeOrmConfig } from './config/typeorm.config';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { LanguageModule } from './modules/language/language.module';
import { EventLogModule } from './modules/event-log/event-log.module';
import { ImageModule } from './modules/image/image.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { ThrottlerGuard } from '@nestjs/throttler';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Config module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
    }),
    
    // TypeORM module
    TypeOrmModule.forRootAsync({
      useFactory: typeOrmConfig,
    }),
    
    // Throttler (Rate limiting)
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100,
    }]),
    
    // Schedule module for cron jobs
    ScheduleModule.forRoot(),
    
    // Feature modules
    AuthModule,
    UserModule,
    LanguageModule,
    EventLogModule,
    ImageModule,
    MonitoringModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
