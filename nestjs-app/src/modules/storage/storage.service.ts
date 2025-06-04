import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs/promises';
import * as path from 'path';

import { Alert } from './entities/alert.entity';
import { AlertData } from './interfaces/alert-data.interface';

interface ScraperResult {
  commune: string;
  data?: { alerts?: AlertData[] };
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    @InjectModel(Alert.name)
    private readonly alertModel: Model<Alert>,
  ) {}

  async create(results: ScraperResult[]): Promise<number> {
    this.logger.log(`${results.length} resultados del scraping.`);

    const allAlerts = results.flatMap((result) => {
      const alerts = result?.data?.alerts;

      if (!alerts || !Array.isArray(alerts) || alerts.length === 0) {
        return [];
      }

      return alerts.map((alert) => ({
        alertId: alert.uuid,
        country: alert.country,
        nThumbsUp: alert.nThumbsUp,
        city: alert.city,
        reportRating: alert.reportRating,
        reportByMunicipalityUser: alert.reportByMunicipalityUser,
        reliability: alert.reliability,
        type: alert.type,
        fromNodeId: alert.fromNodeId,
        speed: alert.speed,
        reportMood: alert.reportMood,
        subtype: alert.subtype,
        street: alert.street,
        additionalInfo: alert.additionalInfo,
        toNodeId: alert.toNodeId,
        id: alert.id,
        nComments: alert.nComments,
        inscale: alert.inscale,
        confidence: alert.confidence,
        roadType: alert.roadType,
        magvar: alert.magvar,
        wazeData: alert.wazeData,
        location: {
          x: alert.location.x,
          y: alert.location.y,
        },
        pubMillis: alert.pubMillis,
        reportBy: alert.reportBy,
        provider: alert.provider,
        providerId: alert.providerId,
        reportDescription: alert.reportDescription,
        nearBy: alert.nearBy,
      }));
    });

    if (allAlerts.length === 0) {
      this.logger.warn('No hay Alertas para insertar en este ciclo.');
      return 0;
    }

    try {
      const insertResult = await this.alertModel.insertMany(allAlerts);

      this.logger.log(
        `Se han insertado ${insertResult.length} Alertas a la DB.`,
      );

      await this.exportToCsv();

      return insertResult.length;
    } catch (error) {
      if (error.code === 11000) {
        this.logger.warn(`Error de Alertas duplicadas.`);

        return error.result?.nInserted || 0;
      } else {
        this.logger.error(
          'Error al insertar las Alertas a la DB:',
          error.stack,
        );

        throw error;
      }
    }
  }

  async countAll(): Promise<number> {
    try {
      const count = await this.alertModel.countDocuments().exec();
      this.logger.debug(`Total de Alertas en la DB: ${count}`);
      return count;
    } catch (error) {
      this.logger.error('Error calculando Alertas totales:', error.stack);
      throw error;
    }
  }

  async findAll() {
    try {
      const allAlerts = await this.alertModel.find().lean();
      return allAlerts;
    } catch (error) {
      this.logger.error('Error al buscar las Alertas:', error.stack);
      throw error;
    }
  }

  async findRandom() {
    try {
      const count = await this.alertModel.estimatedDocumentCount();
      if (count === 0) return null;

      const random = Math.floor(Math.random() * count);
      const [doc] = await this.alertModel.find().skip(random).limit(1);
      return doc;
    } catch (error) {
      this.logger.error('Error al buscar un Alerta aleatoria:', error.stack);
      throw error;
    }
  }

  async exportToCsv(): Promise<void> {
    try {
      const alerts = await this.findAll();

      if (alerts.length === 0) {
        this.logger.warn('No hay alertas para exportar a CSV.');
        return;
      }

      const headers = [
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
        'reportMood',
        'subtype',
        'street',
        'additionalInfo',
        'toNodeId',
        'id',
        'nComments',
        'inscale',
        'confidence',
        'roadType',
        'magvar',
        'wazeData',
        'location_x',
        'location_y',
        'pubMillis',
        'reportBy',
        'provider',
        'providerId',
        'reportDescription',
        'nearBy',
      ];

      const escapeCsvValue = (value: any): string => {
        if (value === null || value === undefined) {
          return '';
        }
        let stringValue = String(value);
        if (
          stringValue.includes(',') ||
          stringValue.includes('"') ||
          stringValue.includes('\n')
        ) {
          stringValue = `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };

      const csvRows = alerts.map((alert) => {
        return headers
          .map((header) => {
            if (header === 'location_x') {
              return escapeCsvValue(alert.location?.x);
            }
            if (header === 'location_y') {
              return escapeCsvValue(alert.location?.y);
            }
            const value = alert[header];
            return escapeCsvValue(value);
          })
          .join(',');
      });

      const csvContent = [headers.join(','), ...csvRows].join('\n');

      const filePath = path.join(process.cwd(), 'data', 'waze_alerts.csv');

      await fs.mkdir(path.dirname(filePath), { recursive: true });

      await fs.writeFile(filePath, csvContent, { encoding: 'utf8' });

      this.logger.log(`Datos exportados exitosamente a ${filePath}`);
    } catch (error) {
      this.logger.error('Error al exportar alertas a CSV:', error.stack);
      throw error;
    }
  }
}
