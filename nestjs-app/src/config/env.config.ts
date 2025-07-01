export const EnvConfiguration = () => ({
  MONGODB_URL:
    process.env.MONGODB_URI ||
    'mongodb://mongodb:27017/mongo-distributedsystems',
  REDIS_HOST: process.env.REDIS_HOST || 'redis',
  REDIS_PORT: process.env.REDIS_PORT || '6379',
  TARGET_EVENT_COUNT: process.env.TARGET_EVENT_COUNT || 100000, // Alertas/eventos a guardar en la base de datos
  SIMULATION_QUERY_COUNT: process.env.SIMULATION_QUERY_COUNT || 1000, // Numero de Querys (trafico) a simular
  CACHE_TTL: process.env.CACHE_TTL || 60, // Tiempo en segundos del TTL
  ELASTICSEARCH_NODE: process.env.ELASTICSEARCH_NODE || 'http://elasticsearch:9200',
});
