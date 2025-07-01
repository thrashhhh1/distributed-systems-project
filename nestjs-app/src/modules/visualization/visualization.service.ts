import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService as NestElasticsearchService } from '@nestjs/elasticsearch';

@Injectable()
export class VisualizationService {
  private readonly logger = new Logger(VisualizationService.name);

  constructor(private readonly esService: NestElasticsearchService) {}

  async bulkIndex(index: string, documents: any[]) {
    if (documents.length === 0) {
      this.logger.warn(`No hay documentos para indexar en '${index}'.`);
      return;
    }

    const body = documents.flatMap((doc) => [
      { index: { _index: index } },
      doc,
    ]);

    try {
      const response = await this.esService.bulk({
        refresh: true,
        body,
      });

      if (response.errors) {
        const erroredDocuments = [];
        response.items.forEach((action, i) => {
          const operation = Object.keys(action)[0];
          if (action[operation].error) {
            erroredDocuments.push({
              status: action[operation].status,
              error: action[operation].error,
              operation: body[i * 2],
              document: body[i * 2 + 1],
            });
          }
        });
        this.logger.error(
          `Errores durante el bulk indexing en '${index}'.`,
          erroredDocuments,
        );
      } else {
        this.logger.log(
          `Se indexaron ${documents.length} documentos en el índice '${index}' exitosamente.`,
        );
      }
      return response;
    } catch (error) {
      this.logger.error(
        `Error fatal durante el bulk indexing en '${index}':`,
        error.stack,
      );
      throw error;
    }
  }

  async createIndexWithMapping(index: string, mapping: any) {
    const indexExists = await this.esService.indices.exists({ index });

    if (indexExists) {
      this.logger.log(`El índice '${index}' ya existe. No se creará de nuevo.`);
      return;
    }

    try {
      await this.esService.indices.create({
        index,
        mappings: mapping,
      });

      this.logger.log(`Índice '${index}' creado con mapeo personalizado.`);
    } catch (error) {
      this.logger.error(`Error al crear el índice '${index}':`, error.stack);
    }
  }
}
