REGISTER '/opt/pig/contrib/piggybank/java/piggybank.jar';

%declare timestamp `date +%Y%m%d_%H%M%S`
%declare output_root_dir '/app_results'
%declare output_execution_dir '$output_root_dir/execution_$timestamp'

sh mkdir -p $output_execution_dir;

filtered_waze_data = LOAD '/waze_incidents/final_unique_waze_alerts' USING PigStorage(',')
AS (
    alertId:chararray,
    country:chararray,
    nThumbsUp:int,
    city:chararray,
    reportRating:int,
    reportByMunicipalityUser:chararray,
    reliability:int,
    type:chararray,
    fromNodeId:long,
    speed:int,
    subtype:chararray,
    street:chararray,
    toNodeId:long,
    id:chararray,
    nComments:int,
    inscale:boolean,
    confidence:int,
    roadType:int,
    location_x:double,
    location_y:double,
    pubMillis:long,
    reportBy:chararray,
    provider:chararray
);

data_with_formatted_date = FOREACH filtered_waze_data GENERATE
    *,
    ToString(ToDate(pubMillis), 'yyyy-MM-dd HH:mm:ss') AS formatted_datetime;


-- --------------------------------------------------------------------------------------
-- 1. Conteo Total de Registros
-- --------------------------------------------------------------------------------------
total_alerts_count = FOREACH (GROUP data_with_formatted_date ALL) GENERATE COUNT(data_with_formatted_date) AS total_count;
STORE total_alerts_count INTO '$output_execution_dir/total_alerts_data' USING PigStorage(',');
sh echo "total_alerts" > $output_execution_dir/header_total_alerts.csv;
sh cat $output_execution_dir/header_total_alerts.csv $output_execution_dir/total_alerts_data/part-* > $output_execution_dir/total_alerts.csv;


-- --------------------------------------------------------------------------------------
-- 2. Análisis de Hora Pico
-- --------------------------------------------------------------------------------------
alerts_with_hour = FOREACH data_with_formatted_date GENERATE
    id,
    city,
    type,
    street,
    formatted_datetime,
    SUBSTRING(formatted_datetime, 11, 13) AS hour; 

alerts_by_hour = GROUP alerts_with_hour BY hour;
hourly_alerts_count = FOREACH alerts_by_hour GENERATE
    group AS hour,
    COUNT(alerts_with_hour) AS num_alerts;
ordered_hours = ORDER hourly_alerts_count BY num_alerts DESC;

STORE ordered_hours INTO '$output_execution_dir/peak_hours_data' USING PigStorage(',');
sh echo "hour,alert_count" > $output_execution_dir/header_peak_hours.csv;
sh cat $output_execution_dir/header_peak_hours.csv $output_execution_dir/peak_hours_data/part-* > $output_execution_dir/peak_hours.csv;


-- --------------------------------------------------------------------------------------
-- 3. Ciudades con Más Alertas
-- --------------------------------------------------------------------------------------
alerts_by_city = GROUP filtered_waze_data BY city;
city_alerts_count = FOREACH alerts_by_city GENERATE
    group AS city,
    COUNT(filtered_waze_data) AS num_alerts;
ordered_cities = ORDER city_alerts_count BY num_alerts DESC;

STORE ordered_cities INTO '$output_execution_dir/most_alerts_cities_data' USING PigStorage(',');
sh echo "city,alert_count" > $output_execution_dir/header_most_alerts_cities.csv;
sh cat $output_execution_dir/header_most_alerts_cities.csv $output_execution_dir/most_alerts_cities_data/part-* > $output_execution_dir/most_alerts_cities.csv;


-- --------------------------------------------------------------------------------------
-- 4. Tipos de Alerta Más Frecuentes
-- --------------------------------------------------------------------------------------
alerts_by_type = GROUP filtered_waze_data BY type;
type_alerts_count = FOREACH alerts_by_type GENERATE
    group AS alert_type,
    COUNT(filtered_waze_data) AS num_alerts;
ordered_types = ORDER type_alerts_count BY num_alerts DESC;

STORE ordered_types INTO '$output_execution_dir/most_frequent_types_data' USING PigStorage(',');
sh echo "alert_type,count" > $output_execution_dir/header_most_frequent_types.csv;
sh cat $output_execution_dir/header_most_frequent_types.csv $output_execution_dir/most_frequent_types_data/part-* > $output_execution_dir/most_frequent_types.csv;


-- --------------------------------------------------------------------------------------
-- 5. Accidentes por Ciudad y Total de Accidentes
-- --------------------------------------------------------------------------------------
accident_alerts = FILTER filtered_waze_data BY type == 'ACCIDENT';

accidents_by_city = GROUP accident_alerts BY city;
city_accidents_count = FOREACH accidents_by_city GENERATE
    group AS city,
    COUNT(accident_alerts) AS num_accidents;
ordered_cities_by_accidents = ORDER city_accidents_count BY num_accidents DESC;

STORE ordered_cities_by_accidents INTO '$output_execution_dir/most_accidents_cities_data' USING PigStorage(',');
sh echo "city,accident_count" > $output_execution_dir/header_accidents_by_city.csv;
sh cat $output_execution_dir/header_accidents_by_city.csv $output_execution_dir/most_accidents_cities_data/part-* > $output_execution_dir/most_accidents_cities.csv;

total_accidents_count = FOREACH (GROUP accident_alerts ALL) GENERATE COUNT(accident_alerts) AS total_count;
STORE total_accidents_count INTO '$output_execution_dir/total_accidents_data' USING PigStorage(',');
sh echo "total_accidents" > $output_execution_dir/header_total_accidents.csv;
sh cat $output_execution_dir/header_total_accidents.csv $output_execution_dir/total_accidents_data/part-* > $output_execution_dir/total_accidents.csv;


-- --------------------------------------------------------------------------------------
-- 6. Calles con Más Alertas
-- --------------------------------------------------------------------------------------
alerts_by_street = GROUP filtered_waze_data BY street;
street_alerts_count = FOREACH alerts_by_street GENERATE
    group AS street,
    COUNT(filtered_waze_data) AS num_alerts;
ordered_streets = ORDER street_alerts_count BY num_alerts DESC;

STORE ordered_streets INTO '$output_execution_dir/most_alerts_streets_data' USING PigStorage(',');
sh echo "street,alert_count" > $output_execution_dir/header_most_alerts_streets.csv;
sh cat $output_execution_dir/header_most_alerts_streets.csv $output_execution_dir/most_alerts_streets_data/part-* > $output_execution_dir/most_alerts_streets.csv;


-- --------------------------------------------------------------------------------------
-- 7. Calles con Más Accidentes (por calle y ciudad)
-- --------------------------------------------------------------------------------------
accidents_group_by_street_city = GROUP accident_alerts BY (street, city);
street_city_accidents_count = FOREACH accidents_group_by_street_city GENERATE
    group.street AS street,
    group.city AS city,
    COUNT(accident_alerts) AS num_accidents;
ordered_streets_by_accidents = ORDER street_city_accidents_count BY num_accidents DESC;

STORE ordered_streets_by_accidents INTO '$output_execution_dir/most_accidents_streets_data' USING PigStorage(',');
sh echo "street,city,accident_count" > $output_execution_dir/header_most_accidents_streets.csv;
sh cat $output_execution_dir/header_most_accidents_streets.csv $output_execution_dir/most_accidents_streets_data/part-* > $output_execution_dir/most_accidents_streets.csv;

-- --------------------------------------------------------------------------------------
-- Principales Alertas por nThumbsUp
-- --------------------------------------------------------------------------------------
top_alerts_by_thumbsup = ORDER filtered_waze_data BY nThumbsUp DESC;
top_10_alerts_thumbsup = LIMIT top_alerts_by_thumbsup 10;

STORE top_10_alerts_thumbsup INTO '$output_execution_dir/top_10_thumbsup_alerts_data' USING PigStorage(',');
sh echo "alertId,country,nThumbsUp,city,reportRating,reportByMunicipalityUser,reliability,type,fromNodeId,speed,subtype,street,toNodeId,id,nComments,inscale,confidence,roadType,location_x,location_y,pubMillis,reportBy,provider" > $output_execution_dir/header_top_10_thumbsup_alerts.csv;
sh cat $output_execution_dir/header_top_10_thumbsup_alerts.csv $output_execution_dir/top_10_thumbsup_alerts_data/part-* > $output_execution_dir/top_10_thumbsup_alerts.csv;

avg_thumbsup_by_type = GROUP filtered_waze_data BY type;
avg_thumbsup_results_intermediate = FOREACH avg_thumbsup_by_type GENERATE
    group AS alert_type,
    AVG(filtered_waze_data.nThumbsUp) AS avg_thumbsup;

avg_thumbsup_results = ORDER avg_thumbsup_results_intermediate BY avg_thumbsup DESC;

STORE avg_thumbsup_results INTO '$output_execution_dir/avg_thumbsup_by_type_data' USING PigStorage(',');
sh echo "alert_type,average_thumbsup" > $output_execution_dir/header_avg_thumbsup_by_type.csv;
sh cat $output_execution_dir/header_avg_thumbsup_by_type.csv $output_execution_dir/avg_thumbsup_by_type_data/part-* > $output_execution_dir/avg_thumbsup_by_type.csv;




