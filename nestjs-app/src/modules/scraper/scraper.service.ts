import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { StorageService } from '../storage/storage.service';
import { communes } from './constants/communes.constants';
import { AlertData } from '../storage/interfaces/alert-data.interface';

interface ScraperResult {
  commune: string;
  data?: {
    alerts?: AlertData[];
  };
}

@Injectable()
export class ScraperService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ScraperService.name);
  private readonly TARGET_EVENT_COUNT =
    this.configService.get<number>('TARGET_EVENT_COUNT');
  private readonly WAIT_INTERVAL_MS = 10000; // Scrape cada 10 segundos, hasta 10k
  private isScrapingLoopActive = false;

  constructor(
    private readonly storageService: StorageService,
    private eventEmitter: EventEmitter2,
    private configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('--- Iniciando el proceso de scraping de eventos ---');
    this.ensureMinimumEvents().catch((error) => {
      this.logger.error(
        'Error al iniciar el proceso de scraping:',
        error.stack,
      );
    });
  }

  async ensureMinimumEvents() {
    if (this.isScrapingLoopActive) {
      this.logger.warn('Scraping activo.');
      return;
    }
    this.isScrapingLoopActive = true;
    this.logger.log(
      `Iniciando ciclo para asegurar ${this.TARGET_EVENT_COUNT} eventos.`,
    );

    try {
      let currentCount = 0;
      while (currentCount < this.TARGET_EVENT_COUNT) {
        currentCount = await this.storageService.countAll();
        this.logger.log(
          `Cantidad de eventos almacenados actualmente: ${currentCount} / ${this.TARGET_EVENT_COUNT}`,
        );

        if (currentCount >= this.TARGET_EVENT_COUNT) {
          this.logger.log(
            `La base de datos ya alcanzo los ${this.TARGET_EVENT_COUNT}, actualmente contiene (${currentCount}) eventos.`,
          );
          this.eventEmitter.emit('scrape.target.reached', {
            eventCount: currentCount,
          });
          break;
        }

        try {
          await this.scrapeData();
        } catch (scrapeError) {
          this.logger.error('Error en ciclo de scrapping:', scrapeError.stack);
        }

        currentCount = await this.storageService.countAll();
        if (currentCount >= this.TARGET_EVENT_COUNT) {
          this.eventEmitter.emit('scrape.target.reached', {
            eventCount: currentCount,
          });
          break;
        } else {
          this.logger.log(
            `Aun no se almacenan (${currentCount}). Espera hasta que se consigan las ${this.TARGET_EVENT_COUNT} alertas.`,
          );
          await new Promise((resolve) =>
            setTimeout(resolve, this.WAIT_INTERVAL_MS),
          );
        }
      }
    } catch (error) {
      this.logger.error(
        'Error en el ciclo de obtener alertas minimas para funcionamiento:',
        error.stack,
      );
    } finally {
      this.isScrapingLoopActive = false;
      this.logger.log('Ciclo finalizado.');
    }
  }

  async scrapeData() {
    this.logger.log('--- Espere mientras se realiza el Scraping ---');
    const results: ScraperResult[] = [];

    for (const bbox of communes) {
      const url = `https://www.waze.com/live-map/api/georss?top=${bbox.top}&bottom=${bbox.bottom}&left=${bbox.left}&right=${bbox.right}&env=row&types=alerts`;

      try {
        const res = await fetch(url);

        if (!res.ok) {
          this.logger.error(
            `Error al obtener el evento: ${bbox.commune}: ${res.status} ${res.statusText}`,
          );
          continue;
        }

        const contentType = res.headers.get('content-type');

        if (contentType && contentType.indexOf('application/json') !== -1) {
          const data = await res.json();

          if (data && data.alerts) {
            const result = { commune: bbox.commune, data };

            results.push(result);
          } else {
            this.logger.warn(`Error al obtener evento de: ${bbox.commune}`);
          }
        }

        await new Promise((res) => setTimeout(res, 500));
      } catch (error) {
        this.logger.error(
          `Error al obtener el evento: ${bbox.commune}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.log(`Ciclo de scrapping finalizado. Total: ${results.length}`);

    if (results.length > 0) {
      try {
        this.logger.log('Guardando los eventos en la base de datos');
        await this.storageService.create(results);
      } catch (error) {
        this.logger.error(
          'Error al guardar los eventos en este ciclo:',
          error.stack,
        );
        throw error;
      }
    } else {
      this.logger.warn('Ningun evento guardado en este ciclo.');
    }
  }
}
