// src/processing/processing.module.ts
import { Module } from '@nestjs/common';
import { ProcessingService } from './processing.service';
import { ProcessingController } from './processing.controller';
import { ConfigModule } from '@nestjs/config';

// No es necesario importar ElasticsearchCustomModule aquí porque es Global.

@Module({
  imports: [ConfigModule], // Importamos ConfigModule para acceder a variables de entorno
  providers: [ProcessingService],
  controllers: [ProcessingController],
})
export class ProcessingModule {}
