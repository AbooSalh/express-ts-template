import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { UserModule } from './common/modules/User/user.module';
import { LanguageModule } from './common/modules/Language/language.module';
import { EventLogModule } from './common/modules/EventLog/eventlog.module';
import { ImageModule } from './common/modules/Image/image.module';
import { MonitoringModule } from './common/modules/Monitoring/monitoring.module';
import { AuthModule } from './common/modules/User/auth/auth.module';
import env from './common/config/env.config';

@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => env],
    }),
    
    // MongoDB connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const connectionOptions: any = {
          dbName: configService.get('DB_NAME'),
        };

        // Add authentication if credentials are provided
        const dbUser = configService.get('DB_USER');
        const dbPassword = configService.get('DB_PASSWORD');
        
        if (dbUser && dbPassword) {
          connectionOptions.auth = {
            username: dbUser,
            password: dbPassword,
          };
          connectionOptions.authSource = 'admin';
        }

        return {
          uri: configService.get('DB_URL'),
          ...connectionOptions,
        };
      },
      inject: [ConfigService],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get('RATE_LIMIT_WINDOW_MINUTES', 15) * 60 * 1000,
            limit: configService.get('RATE_LIMIT_MAX_REQUESTS', 100),
          },
        ],
      }),
      inject: [ConfigService],
    }),

    // Feature modules
    AuthModule,
    UserModule,
    LanguageModule,
    EventLogModule,
    ImageModule,
    MonitoringModule,
  ],
})
export class AppModule {}
