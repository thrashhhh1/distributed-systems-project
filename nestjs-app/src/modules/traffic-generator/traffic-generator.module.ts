import { Module } from '@nestjs/common';

import { StorageModule } from '../storage/storage.module';
import { CacheModule } from '../cache/cache.module';
import { TrafficGeneratorService } from './traffic-generator.service';

@Module({
  imports: [StorageModule, CacheModule],
  providers: [TrafficGeneratorService],
})
export class TrafficGeneratorModule {}
