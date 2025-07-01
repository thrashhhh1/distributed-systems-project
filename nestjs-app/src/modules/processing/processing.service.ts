// src/processing/processing.service.ts
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

  /**
   * Orquesta todo el proceso de lectura de los resultados de Pig y su indexación.
   */
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

      // 1. Indexar las alertas únicas y limpias (el dataset principal)
      await this.processUniqueAlerts(latestExecutionDir);

      // 2. Indexar las métricas agregadas
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

  /**
   * Procesa el archivo principal de alertas únicas.
   */
  private async processUniqueAlerts(executionDir: string) {
    const indexName = 'traffic_alerts';
    const filePath = path.join(
      executionDir,
      'final_unique_waze_alerts',
      'part-m-00000',
    ); // Pig nombra así a sus archivos de salida

    // Crear un mapeo para que Elasticsearch entienda la ubicación como un punto geográfico
    await this.esService.createIndexWithMapping(indexName, {
      properties: {
        location: { type: 'geo_point' },
        pubMillis: { type: 'date', format: 'epoch_millis' }, // Definir el campo de fecha
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
      // Combinar latitud y longitud en un solo objeto para geo_point
      location: {
        lat: parseFloat(r.location_y),
        lon: parseFloat(r.location_x),
      },
      // Convertir campos numéricos
      nThumbsUp: parseInt(r.nThumbsUp, 10),
      reportRating: parseInt(r.reportRating, 10),
      reliability: parseInt(r.reliability, 10),
      speed: parseInt(r.speed, 10),
      confidence: parseInt(r.confidence, 10),
      roadType: parseInt(r.roadType, 10),
      pubMillis: parseInt(r.pubMillis, 10),
      // Eliminar los campos originales de lat/lon
      location_x: undefined,
      location_y: undefined,
    }));

    await this.esService.bulkIndex(indexName, formattedRecords);
  }

  /**
   * Procesa un archivo CSV de métrica agregada de forma genérica.
   */
  private async processAggregatedMetric(
    executionDir: string,
    indexName: string,
    fileName: string,
    columns: string[],
  ) {
    const filePath = path.join(executionDir, fileName);

    // ANTES (Incorrecto):
    // const records = await this.readAndParseCsv(filePath, columns, true);

    // AHORA (Correcto):
    // Le pasamos el número 2 para que empiece a parsear desde la segunda línea,
    // ignorando así la cabecera.
    const records = await this.readAndParseCsv(filePath, columns, 2);

    // Convertir valores numéricos que vienen como strings
    const formattedRecords = records.map((record) => {
      const newRecord = { ...record };
      for (const key in newRecord) {
        // Usamos endsWith para ser más flexibles (ej. alert_count, accident_count)
        if (key.endsWith('count') || key.endsWith('average')) {
          newRecord[key] = parseFloat(newRecord[key]);
        }
      }
      return newRecord;
    });

    await this.esService.bulkIndex(indexName, formattedRecords);
  }

  /**
   * Encuentra el directorio de la última ejecución de Pig.
   */
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

  /**
   * Lee y parsea un archivo CSV.
   */
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
            from_line: fromLine, // Esta opción espera un número
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
