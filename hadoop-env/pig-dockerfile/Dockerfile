FROM bde2020/hadoop-base:2.0.0-hadoop3.2.1-java8

ENV PIG_VERSION=0.17.0
ENV PIG_URL=https://archive.apache.org/dist/pig/pig-${PIG_VERSION}/pig-${PIG_VERSION}.tar.gz

ENV PIG_HOME=/opt/pig
ENV PATH=$PATH:$PIG_HOME/bin

# Modificar los sources.list para usar los repositorios de archivo de Debian (solución al error 404)
RUN sed -i 's/deb.debian.org/archive.debian.org/g' /etc/apt/sources.list && \
    sed -i 's/security.debian.org/archive.debian.org/g' /etc/apt/sources.list && \
    sed -i '/stretch-updates/d' /etc/apt/sources.list && \
    echo "deb http://archive.debian.org/debian stretch-backports main" >> /etc/apt/sources.list

# Instalar wget, ca-certificates y otras herramientas necesarias
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    ca-certificates \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Descargar, extraer y configurar Pig
RUN mkdir -p /tmp/pig_install && \
    wget -qO- ${PIG_URL} | tar -xz -C /tmp/pig_install && \
    mv /tmp/pig_install/pig-${PIG_VERSION} ${PIG_HOME} && \
    rm -rf /tmp/pig_install

# Copia el script de carga de datos al contenedor y le da permisos de ejecución
COPY load_data.sh /usr/local/bin/load_data.sh
RUN chmod +x /usr/local/bin/load_data.sh

# CAMBIO CLAVE AQUÍ: Ahora el contenedor ejecutará load_data.sh al iniciar
CMD ["/usr/local/bin/load_data.sh"]