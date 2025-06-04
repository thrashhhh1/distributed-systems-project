# Proyecto Sistemas Distribuidos: Plataforma de análisis de tráfico

Tecnologías: NestJS como framework de backend, MongoDB como sistema de almacenamiento y Pig como sistema de filtrado y procesamiento. Toda la aplicación está contenerizada usando Docker y Docker Compose.

**Funcionalidades:**

* **Scraper:** Extrae datos de alertas de tráfico desde el Live Map de Waze para diversas comunas de la RM de forma automática al iniciar. Continúa ejecutándose en ciclos hasta almacenar al menos 10.000 eventos en la base de datos.
* **Almacenamiento:** Guarda los eventos de Waze obtenidos en una base de datos MongoDB.
* **Homogeneización y Filtrado:** Procesa los datos crudos exportados de MongoDB usando Apache Pig para eliminar duplicados, limpiar y estandarizar campos, y aplicar filtros de calidad y relevancia.
* **Procesamiento y Análisis:** Realiza análisis detallados sobre los datos limpios utilizando Apache Pig para generar reportes y estadísticas clave sobre las alertas de tráfico.

## Prerequisitos

Para ejecutar este proyecto, se necesita instalado:

* **Docker**
* **Docker Compose**

(No es estrictamente necesario tener Node.js o npm instalados en la máquina host si solo se va a ejecutar via Docker).

## Configuración

1.  **Clonar el Repositorio:**
    ```bash
    git clone https://github.com/thrashhhh1/distributed-systems-project
    cd distributed-systems-project
    ```

2.  **Archivo de Entorno (`.env`):**
    Este proyecto no requiere la creación de un archivo `.env`; ya tiene valores por defecto. En el caso de querer hacer cambios, modificar 'hadoop-config/hadoop.env' y/o 'nestjs-app/src/config/env.config.ts'.


## Ejecución (Usando Docker Compose)

1.  **Abrir Terminal:** Navegar a la carpeta raíz del proyecto donde se encuentra el archivo `docker-compose.yaml`.
2.  **Construir e Iniciar Servicios:** Ejecuta el siguiente comando. La primera vez, el paso de `build` puede tardar unos minutos.
    ```bash
    docker-compose up -d --build
    ```

3.  **Verificar Contenedores:** Puedes ver los contenedores corriendo con:
    ```bash
    docker ps
    ```
    Deben estar los contenedores para `distributedsystems`, `mongodb`, `namenode-1`, `datanode-1`, `resourcemanager-1`, `nodemanager-1` y `pig-1`.

4.  **Ver Logs de la Aplicación:** Para ver qué está haciendo la aplicación NestJS (scraper, y almacenamiento), usa:
    ```bash
    docker-compose logs -f app
    ```
    * `-f`: Seguir los logs en tiempo real (Ctrl+C para salir).
    * `app`: Nombre del servicio de tu aplicación en `docker-compose.yaml`.
    * **Qué buscar:** Mensajes de inicio de NestJS, logs del `ScraperService`, una vez el scraper finalice, podrás hacer el siguiente paso.

## Ejecución de filtrado y procesamiento de datos

Para comparar diferentes configuraciones de caché:

1.  Asegurar de que los contenedores estén corriendo (`docker-compose up -d`).
2.  Ejecuta los siguientes comandos en la terminal en la raíz del proyecto.
    - Para ejecutar la bash del contenedor de Pig:
    ```bash
    docker exec -it distributed-systems-project-pig-1 bash
    ```
    - Para ejecutar el filtrado:
    ```bash
    pig -f /pig-scripts/filtering.pig
    ```
    Una vez se termine de ejecutar, se puede ejecutar el siguiente comando de procesado de datos.
    - Para ejecutar el procesado de datos o módulo processing:
    ```bash
    pig -f /pig-scripts/processing.pig
    ```
3.  Una vez finalice esta ejecución, en la raíz del proyecto se generarán unos archivos con los resultados de este.


## Detener la Aplicación

Para detener y eliminar los contenedores y la red creada por compose:

```bash
docker-compose down


