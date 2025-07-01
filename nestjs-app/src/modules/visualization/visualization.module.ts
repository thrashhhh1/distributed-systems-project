import { Module, Global } from '@nestjs/common';
import { ElasticsearchModule as NestElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VisualizationService } from './visualization.service';

@Global()
@Module({
  imports: [
    NestElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        // La URL de tu contenedor de Elasticsearch, leída desde las variables de entorno
        node: configService.get<string>(
          'ELASTICSEARCH_NODE',
          'http://elasticsearch:9200',
        ),
        // Aumentamos el timeout para operaciones de bulk indexing
        requestTimeout: 60000,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [VisualizationService],
  exports: [VisualizationService], // Exportamos el servicio para que otros módulos puedan usarlo
})
export class VisualizationModule {}
