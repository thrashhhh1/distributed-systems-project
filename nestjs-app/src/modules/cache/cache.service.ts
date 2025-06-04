import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const result = await this.cacheManager.get<T>(key);
      if (result !== undefined && result !== null) {
        this.cacheHits++;
        this.logger.debug(`${key} HIT en cache`);
      } else {
        this.cacheMisses++;
        this.logger.debug(`${key} MISS en cache`);
      }
      return result;
    } catch (error) {
      this.logger.error(
        `Error al obtener ${key} del cache: ${error.message}`,
        error.stack,
      );
      this.cacheMisses++;
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      this.logger.debug(`Setteando en cache: ${key}`);
      if (ttl) {
        await this.cacheManager.set(key, value, ttl);
      } else {
        await this.cacheManager.set(key, value, ttl);
      }
    } catch (error) {
      this.logger.error(
        `Error al settear ${key} en cache: ${error.message}`,
        error.stack,
      );
    }
  }

  async del(key: string): Promise<void> {
    try {
      this.logger.debug(`Eliminando de cache: ${key}`);
      await this.cacheManager.del(key);
      this.logger.debug(`${key} eliminada del cache.`);
    } catch (error) {
      this.logger.error(
        `Error al intentar eliminar ${key} del cache: ${error.message}`,
        error.stack,
      );
    }
  }

  getCacheStats() {
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total === 0 ? 0 : (this.cacheHits / total) * 100;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      total: total,
      hitRate: hitRate.toFixed(2) + '%',
    };
  }

  async resetCacheStatsAndClearCache() {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.logger.log('Reiniciando estadisticas del cache.');
    try {
      await this.cacheManager.clear();
      this.logger.log('Cache limpia.');
    } catch (error) {
      this.logger.error('Error al limpiar cache', error.stack);
    }
  }

  // Metodo para el analisis de las politicas y tasas de arribo
  printAndResetCacheStats(simulationType: string) {
    this.logger.log(
      `--- Estadisticas de cache con simulacion: ${simulationType} ---`,
    );
    const stats = this.getCacheStats();
    this.logger.log(`Total de HITS: ${stats.hits}`);
    this.logger.log(`Total de MISSES: ${stats.misses}`);
    this.logger.log(`Total de QUERYS: ${stats.total}`);
    this.logger.log(`HIT RATE: ${stats.hitRate}`);
    this.logger.log(`--------------------------------------------------`);
    this.resetCacheStatsAndClearCache();
  }
}
