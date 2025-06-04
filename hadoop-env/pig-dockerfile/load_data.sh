#! /bin/bash
INPUT_FILE="/data/waze_alerts.csv"
HDFS_DIR="/waze_incidents"
HDFS_FILE_NAME="waze_alerts.csv" 
echo "Esperando que NameNode esté listo..."
sleep 30

echo "Creando directorio $HDFS_DIR en HDFS (si no existe)..."
hdfs dfs -mkdir -p "$HDFS_DIR"

echo "Esperando que el archivo $INPUT_FILE exista..."
while [ ! -f "$INPUT_FILE" ]; do
    echo "Archivo $INPUT_FILE no encontrado, esperando..."
    sleep 5 
done

echo "Archivo $INPUT_FILE encontrado. Copiando a $HDFS_DIR/$HDFS_FILE_NAME en HDFS..."
hdfs dfs -put -f "$INPUT_FILE" "$HDFS_DIR/$HDFS_FILE_NAME"

echo "Carga de datos a HDFS completada."


tail -f /dev/null