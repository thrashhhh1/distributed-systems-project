import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { EnvConfiguration } from './config/env.config';
import { DatabaseModule } from './core/database/database.module';
import { RedisModule } from './core/cache/redis.module';
import { ScraperModule } from './modules/scraper/scraper.module';
import { StorageModule } from './modules/storage/storage.module';
import { TrafficGeneratorModule } from './modules/traffic-generator/traffic-generator.module';
import { CacheModule } from './modules/cache/cache.module';
import { VisualizationModule } from './modules/visualization/visualization.module';
import { ProcessingModule } from './modules/processing/processing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [EnvConfiguration],
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    RedisModule,
    ScraperModule,
    StorageModule,
    TrafficGeneratorModule,
    CacheModule,
    ProcessingModule,
    VisualizationModule,
  ],
})
export class AppModule {}
