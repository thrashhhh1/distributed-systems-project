// src/processing/processing.controller.ts
import { Controller, Post, Logger } from '@nestjs/common';
import { ProcessingService } from './processing.service';

@Controller('processing')
export class ProcessingController {
  private readonly logger = new Logger(ProcessingController.name);

  constructor(private readonly processingService: ProcessingService) {}

  @Post('start-indexing')
  startIndexing() {
    this.logger.log(
      'Se recibió una solicitud para iniciar la indexación de los resultados de Pig.',
    );
    // No esperamos a que termine para responder rápidamente a la solicitud HTTP.
    // El proceso correrá en segundo plano.
    this.processingService.processAndIndexPigResults();
    return {
      message:
        'El proceso de indexación ha comenzado. Revisa los logs para ver el progreso.',
    };
  }
}


