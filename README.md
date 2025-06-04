# Proyecto Sistemas Distribuidos: Plataforma de análisis de tráfico

Tecnologías: NestJS como framework de backend, MongoDB como sistema de almacenamiento y Redis como sistema de caché. Toda la aplicación está contenerizada usando Docker y Docker Compose.

**Funcionalidades:**

* **Scraper:** Extrae datos de alertas de tráfico desde el Live Map de Waze para diversas comunas de la RM de forma automática al iniciar. Continúa ejecutándose en ciclos hasta almacenar al menos 10.000 eventos en la base de datos.
* **Almacenamiento:** Guarda los eventos de Waze obtenidos en una base de datos MongoDB.
* **Generador de Tráfico:** Simula automáticamente consultas hacia el sistema de caché utilizando los datos almacenados, aplicando distribuciones de llegada Poisson y/o Uniforme (configurable).
* **Caché:** Utiliza Redis para almacenar en caché los eventos consultados frecuentemente por el generador de tráfico. Implementa métricas de rendimiento (Hits, Misses, Hit Rate) y permite experimentar con diferentes políticas de remoción y tamaños configurando el servicio Redis.

## Prerequisitos

Para ejecutar este proyecto, se necesita instalado:

* **Docker**
* **Docker Compose**

(No es estrictamente necesario tener Node.js o npm instalados en la máquina host si solo se va a ejecutar via Docker).

## Configuración

1.  **Clonar el Repositorio:**
    ```bash
    git clone https://github.com/thrashhhh1/distributedsystems-firstproject
    cd distributedsystems-firstproject
    ```

2.  **Archivo de Entorno (`.env`):**
    Este proyecto utiliza un archivo `.env` en la raíz para configurar variables esenciales. **Se recomienda encarecidamente crear este archivo** para tener claridad sobre la configuración y poder modificarla fácilmente. Crea un archivo llamado `.env` y copia/pega el siguiente contenido como punto de partida:

    ```dotenv
    # .env

    # Puerto en el que correrá la aplicación NestJS dentro del contenedor
    PORT=3000

    # URL de conexión a MongoDB
    # Importante: Usa el nombre del servicio 'mongodb' definido en docker-compose.yaml
    MONGODB_URL=mongodb://mongodb:27017/mongo-distributedsystems 

    # Configuración de Redis
    # Importante: Usa el nombre del servicio 'redis' definido en docker-compose.yaml
    REDIS_HOST=redis
    REDIS_PORT=6379

    # TTL por defecto para la caché en segundos (1 minuto)
    CACHE_TTL=60

    # Tipos de distribución para el generador de tráfico (separados por coma: poisson,uniforme)
    # Dejar vacío o comentar para usar el default ('poisson,uniforme') definido en el código
    # TRAFFIC_DISTRIBUTION_TYPES=poisson,uniforme 

    # Número de consultas a simular por cada distribución en el generador de tráfico
    # Dejar vacío o comentar para usar el default (1000) definido en el código
    # SIMULATION_QUERY_COUNT=1000 
    ```

    *(**Nota Importante:** Si decides **no crear** el archivo `.env`, la aplicación intentará iniciarse utilizando los valores predeterminados definidos en el código (principalmente en `src/config/env.config.ts`) y en `docker-compose.yaml` (a través de la sintaxis `${VARIABLE:-default}`). Esto **solo funcionará correctamente si los puertos por defecto mapeados en `docker-compose.yaml` (`3000` para la app, `27017` para MongoDB, `6379` para Redis) no están ya en uso** en tu máquina host. Crear el archivo `.env` sigue siendo la forma recomendada de gestionar la configuración.)*

3.  **Configuración de Experimentos de Caché:**
    Para evaluar diferentes políticas de remoción y tamaños de caché de Redis, edita el archivo `docker-compose.yaml`. Busca la sección del servicio `redis` y descomenta **SOLO UNA** de las líneas `command:` según el experimento que quieras realizar.

    ```yaml
    # Ejemplo dentro de docker-compose.yaml, servicio redis:
      redis:
        # ... (image, ports, etc.) ...
        # --- Comando para configurar Redis (ELIGE UNA  SOLA LÍNEA y descoméntala!) --- 
        command: redis-server --save "" --appendonly no --maxmemory 150kb --maxmemory-policy allkeys-lru
        # command: redis-server --save "" --appendonly no --maxmemory 8mb --maxmemory-policy allkeys-lfu 
        # ... (otras opciones que hayas añadido) ...
    ```

## Ejecución (Usando Docker Compose)

1.  **Abrir Terminal:** Navegar a la carpeta raíz del proyecto donde se encuentran los archivos `docker-compose.yaml` y `Dockerfile`.
2.  **Construir e Iniciar Servicios:** Ejecuta el siguiente comando. La primera vez, el paso de `build` puede tardar unos minutos.
    ```bash
    docker-compose up -d --build
    ```

3.  **Verificar Contenedores:** Puedes ver los contenedores corriendo con:
    ```bash
    docker ps
    ```
    Deben estar los contenedores para `app`, `mongodb` y `redis`.

4.  **Ver Logs de la Aplicación:** Para ver qué está haciendo la aplicación NestJS (scraper, generador de tráfico, estadísticas de caché), usa:
    ```bash
    docker-compose logs -f app
    ```
    * `-f`: Seguir los logs en tiempo real (Ctrl+C para salir).
    * `app`: Nombre del servicio de tu aplicación en `docker-compose.yaml`.
    * **Qué buscar:** Mensajes de inicio de NestJS, logs del `ScraperService`, logs del `TrafficGeneratorService`, y logs del `CacheService` con las estadísticas.

## Ejecución de Experimentos de Caché

Para comparar diferentes configuraciones de caché:

1.  Asegurar de que los contenedores estén corriendo (`docker-compose up -d`).
2.  Deja que la simulación de tráfico se ejecute (monitoriza con `docker-compose logs -f app`).
3.  Cuando termine, se imprimirán las estadísticas en consola. Anota los resultados (Hit Rate).
4.  Detén y elimina los contenedores: `docker-compose down`.
5.  Edita `docker-compose.yaml`, comenta la línea `command:` de Redis anterior y descomenta la nueva configuración que quieres probar. Guarda el archivo.
6.  Inicia de nuevo: `docker-compose up -d` (no siempre necesitas `--build` si solo cambiaste el `command` de Redis).


## Detener la Aplicación

Para detener y eliminar los contenedores y la red creada por compose:

```bash
docker-compose down


