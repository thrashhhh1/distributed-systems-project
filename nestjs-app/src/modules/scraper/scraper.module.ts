import { Module } from '@nestjs/common';

import { StorageModule } from '../storage/storage.module';
import { ScraperService } from './scraper.service';

@Module({
  imports: [StorageModule],
  providers: [ScraperService],
})
export class ScraperModule {}
