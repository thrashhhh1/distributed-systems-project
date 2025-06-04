import { Injectable, Logger } from '@nestjs/common';
// import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';

import { StorageService } from '../storage/storage.service';
import { CacheService } from '../cache/cache.service';
import { Alert } from '../storage/entities/alert.entity';
import { getPoissonInterval } from './distribution/distribution.poisson';
import { getUniformInterval } from './distribution/distribution.uniform';

@Injectable()
export class TrafficGeneratorService {
  private readonly logger = new Logger(TrafficGeneratorService.name);

  constructor(
    private cacheService: CacheService,
    private storageService: StorageService,
    private configService: ConfigService,
  ) {}

  // @OnEvent('scrape.target.reached')
  async handleScrapingComplete(payload: { eventCount: number }) {
    this.logger.log(
      `Conteo de alertas=${payload.eventCount}. Iniciando simulacion de trafico...`,
    );

    const distributionTypesRaw = this.configService.get<string>(
      'TRAFFIC_DISTRIBUTION_TYPES',
      'poisson,uniforme',
    );

    const distributionTypes = distributionTypesRaw
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t === 'poisson' || t === 'uniforme');

    if (distributionTypes.length === 0) {
      this.logger.error(
        'No se especificaron tipos de distribución válidos en TRAFFIC_DISTRIBUTION_TYPES.',
      );
      return;
    }

    const simulationQueryCount = parseInt(
      this.configService.get<string>('SIMULATION_QUERY_COUNT'),
    );

    if (isNaN(simulationQueryCount) || simulationQueryCount <= 0) {
      this.logger.error(
        `Valor invalido ${this.configService.get<string>('SIMULATION_QUERY_COUNT')}. Usando 1000 por defecto.`,
      );
    }

    this.logger.log(
      `Distribuciones a ejecutar: ${distributionTypes.join(', ')}`,
    );
    this.logger.log(
      `Numero de queries por simulacion: ${simulationQueryCount}`,
    );

    try {
      for (const type of distributionTypes) {
        const distributionType = type as 'poisson' | 'uniforme';
        this.logger.log(`--- Iniciando simulación: ${distributionType} ---`);
        await this.generateTraffic(distributionType, simulationQueryCount);
        this.cacheService.printAndResetCacheStats(distributionType);
      }

      this.logger.log('Todas las simulaciones de trafico han finalizado.');
    } catch (error) {
      this.logger.error('La simulacion de trafico fallo:', error.stack);
    }
  }

  private getInterval(type: 'poisson' | 'uniforme'): number {
    if (type === 'poisson') {
      this.logger.debug('-> Utilizando intervalo Poisson');
      return getPoissonInterval();
    }
    this.logger.debug('-> Utilizando intervalo Uniforme');
    return getUniformInterval();
  }

  private async simulateSingleQuery(): Promise<Alert | null> {
    let alertData: Alert | null = null;
    let alertId: string | null = null;
    try {
      const randomAlertFromDb = await this.storageService.findRandom();
      if (!randomAlertFromDb || !randomAlertFromDb.alertId) {
        this.logger.warn(
          'Np se pudo obtener una alerta random del almacenamiento.',
        );
        return null;
      }
      alertId = randomAlertFromDb.alertId;
      const cacheKey = `alert:${alertId}`;
      alertData = await this.cacheService.get<Alert>(cacheKey);
      if (!alertData) {
        alertData = randomAlertFromDb;
        await this.cacheService.set(cacheKey, alertData);
      }
    } catch (error) {
      this.logger.error(
        `Error en una sola simulacion de la query (Intento AlertID: ${alertId}): ${error.message}`,
        error.stack,
      );
      return null;
    }
    return alertData;
  }

  async generateTraffic(
    type: 'poisson' | 'uniforme',
    count: number,
  ): Promise<void> {
    this.logger.log(
      `--- Iniciando generacion de trafico con distribucion: ${type} y ${count} queries ---`,
    );
    for (let i = 0; i < count; i++) {
      await this.simulateSingleQuery();
      const waitTime = this.getInterval(type);
      if (waitTime > 0) {
        await new Promise((res) => setTimeout(res, waitTime));
      }
    }
    this.logger.log(
      `--- Ciclo de generacion de trafico con distribucion ${type} finalizado ---`,
    );
  }
}
