import { Module } from '@nestjs/common';
import { ProcessingService } from './processing.service';
import { ProcessingController } from './processing.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [ProcessingService],
  controllers: [ProcessingController],
  exports: [ProcessingService],
})
export class ProcessingModule {}
