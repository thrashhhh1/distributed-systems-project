import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { parse } from 'csv-parse';
import { VisualizationService } from '../visualization/visualization.service';

@Injectable()
export class ProcessingService {
  private readonly logger = new Logger(ProcessingService.name);
  private readonly PIG_OUTPUT_DIR = this.configService.get<string>(
    'PIG_OUTPUT_DIR',
    '/app_results',
  );

  constructor(
    private readonly esService: VisualizationService,
    private readonly configService: ConfigService,
  ) {}

  async processAndIndexPigResults() {
    this.logger.log(
      '--- Iniciando proceso de indexación de resultados de Pig ---',
    );
    try {
      const latestExecutionDir = await this.getLatestExecutionDirectory();
      if (!latestExecutionDir) {
        this.logger.warn(
          'No se encontró ningún directorio de resultados de Pig para procesar.',
        );
        return;
      }

      this.logger.log(`Procesando directorio: ${latestExecutionDir}`);

      await this.processUniqueAlerts(latestExecutionDir);

      await this.processAggregatedMetric(
        latestExecutionDir,
        'peak_hours',
        'peak_hours.csv',
        ['hour', 'alert_count'],
      );
      await this.processAggregatedMetric(
        latestExecutionDir,
        'city_alerts',
        'most_alerts_cities.csv',
        ['city', 'alert_count'],
      );
      await this.processAggregatedMetric(
        latestExecutionDir,
        'type_alerts',
        'most_frequent_types.csv',
        ['alert_type', 'count'],
      );
      await this.processAggregatedMetric(
        latestExecutionDir,
        'street_alerts',
        'most_alerts_streets.csv',
        ['street', 'alert_count'],
      );
      await this.processAggregatedMetric(
        latestExecutionDir,
        'city_accidents',
        'most_accidents_cities.csv',
        ['city', 'accident_count'],
      );
      await this.processAggregatedMetric(
        latestExecutionDir,
        'street_accidents',
        'most_accidents_streets.csv',
        ['street', 'city', 'accident_count'],
      );
      await this.processAggregatedMetric(
        latestExecutionDir,
        'avg_thumbsup_by_type',
        'avg_thumbsup_by_type.csv',
        ['alert_type', 'average_thumbsup'],
      );

      this.logger.log(
        '--- Proceso de indexación de resultados de Pig finalizado exitosamente ---',
      );
    } catch (error) {
      this.logger.error('Falló el proceso de indexación de Pig:', error.stack);
    }
  }

  private async processUniqueAlerts(executionDir: string) {
    const indexName = 'traffic_alerts';
    const filePath = path.join(
      executionDir,
      'final_unique_waze_alerts',
      'part-m-00000',
    );

    await this.esService.createIndexWithMapping(indexName, {
      properties: {
        location: { type: 'geo_point' },
        pubMillis: { type: 'date', format: 'epoch_millis' },
      },
    });

    const records = await this.readAndParseCsv(filePath, [
      'alertId',
      'country',
      'nThumbsUp',
      'city',
      'reportRating',
      'reportByMunicipalityUser',
      'reliability',
      'type',
      'fromNodeId',
      'speed',
      'subtype',
      'street',
      'toNodeId',
      'id',
      'nComments',
      'inscale',
      'confidence',
      'roadType',
      'location_x',
      'location_y',
      'pubMillis',
      'reportBy',
      'provider',
    ]);

    const formattedRecords = records.map((r) => ({
      ...r,
      location: {
        lat: parseFloat(r.location_y),
        lon: parseFloat(r.location_x),
      },
      nThumbsUp: parseInt(r.nThumbsUp, 10),
      reportRating: parseInt(r.reportRating, 10),
      reliability: parseInt(r.reliability, 10),
      speed: parseInt(r.speed, 10),
      confidence: parseInt(r.confidence, 10),
      roadType: parseInt(r.roadType, 10),
      pubMillis: parseInt(r.pubMillis, 10),
      location_x: undefined,
      location_y: undefined,
    }));

    await this.esService.bulkIndex(indexName, formattedRecords);
  }

  private async processAggregatedMetric(
    executionDir: string,
    indexName: string,
    fileName: string,
    columns: string[],
  ) {
    const filePath = path.join(executionDir, fileName);

    const records = await this.readAndParseCsv(filePath, columns, 2);

    const formattedRecords = records.map((record) => {
      const newRecord = { ...record };
      for (const key in newRecord) {
        if (key.endsWith('count') || key.endsWith('average')) {
          newRecord[key] = parseFloat(newRecord[key]);
        }
      }
      return newRecord;
    });

    await this.esService.bulkIndex(indexName, formattedRecords);
  }

  private async getLatestExecutionDirectory(): Promise<string | null> {
    try {
      const allEntries = await fs.readdir(this.PIG_OUTPUT_DIR, {
        withFileTypes: true,
      });
      const directories = allEntries
        .filter(
          (entry) => entry.isDirectory() && entry.name.startsWith('execution_'),
        )
        .map((entry) => entry.name)
        .sort()
        .reverse();

      return directories.length > 0
        ? path.join(this.PIG_OUTPUT_DIR, directories[0])
        : null;
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.error(
          `El directorio de salida de Pig no existe: ${this.PIG_OUTPUT_DIR}`,
        );
        return null;
      }
      throw error;
    }
  }

  private async readAndParseCsv(
    filePath: string,
    columns: string[],
    fromLine = 1,
  ): Promise<any[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return new Promise((resolve, reject) => {
        parse(
          content,
          {
            delimiter: ',',
            columns: columns,
            from_line: fromLine,
          },
          (err, records) => {
            if (err) {
              this.logger.error(
                `Error al parsear el archivo CSV: ${filePath}`,
                err.stack,
              );
              reject(err);
            } else {
              resolve(records);
            }
          },
        );
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.warn(
          `El archivo de métrica no fue encontrado: ${filePath}`,
        );
        return [];
      }
      throw error;
    }
  }
}
