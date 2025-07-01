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
        node: configService.get<string>(
          'ELASTICSEARCH_NODE',
          'http://elasticsearch:9200',
        ),
        requestTimeout: 60000,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [VisualizationService],
  exports: [VisualizationService],
})
export class VisualizationModule {}
