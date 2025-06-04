import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Alert } from './entities/alert.entity';
import { AlertSchema } from './entities/alert.entity';
import { StorageService } from './storage.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Alert.name,
        schema: AlertSchema,
      },
    ]),
  ],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
