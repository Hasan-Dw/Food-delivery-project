import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import configuration, { validateEnvironment } from '../config/configuration';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('mongodbUri') ?? 'mongodb://127.0.0.1:27017/savora',
        autoIndex: config.get<string>('nodeEnv') !== 'production',
      }),
    }),
  ],
})
export class DatabaseModule {}

/**
 * Central configuration module. Keeping it here makes the environment contract
 * explicit and prevents individual modules from reading `process.env` directly.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnvironment,
      envFilePath: ['.env'],
    }),
  ],
  exports: [ConfigModule],
})
export class AppConfigModule {}
