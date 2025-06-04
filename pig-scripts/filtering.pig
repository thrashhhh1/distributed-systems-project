raw_waze_data = LOAD '/waze_incidents/waze_alerts.csv' USING PigStorage(',')
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
    reportMood:int,                     -- a eliminar
    subtype:chararray,
    street:chararray,
    additionalInfo:chararray,           -- a eliminar
    toNodeId:long,
    id:chararray,                       -- a deduplicacr
    nComments:int,
    inscale:boolean,
    confidence:int,
    roadType:int,
    magvar:int,                         -- a eliminar
    wazeData:chararray,                 -- a eliminar
    location_x:double,
    location_y:double,
    pubMillis:long,
    reportBy:chararray,
    provider:chararray,
    providerId:chararray,
    reportDescription:chararray,        -- a eliminar
    nearBy:chararray                    -- a eliminar
);

-- En el filtrado queremos tener datos fiables, osea con realibility mayor o igual a 1
-- ademas se filtran las alertas que no tengan los campos type, city, subtype y street
-- ya que son necesarios para el procesamiento. Y algunos datos ya estan filtrados por defecto
-- a la hora de hacer el scraping
filtered_alerts = FILTER raw_waze_data BY
    reliability >= 1
    AND type IS NOT NULL AND type != ''
    AND city IS NOT NULL AND city != ''
    AND subtype IS NOT NULL AND subtype != ''
    AND street IS NOT NULL AND street != '';

-- Aca eliminamos los campos que se mencionan arriba
cleaned_alerts = FOREACH filtered_alerts GENERATE
    alertId,
    TRIM(country) AS country,
    nThumbsUp,
    TRIM(city) AS city,
    reportRating,
    reportByMunicipalityUser,
    reliability,
    UPPER(TRIM(type)) AS type,
    fromNodeId,
    speed,
    UPPER(TRIM(subtype)) AS subtype,
    TRIM(street) AS street,
    toNodeId,
    id, -- Este es el id por el que vamos a deduplicar
    nComments,
    inscale,
    confidence,
    roadType,
    location_x,
    location_y,
    pubMillis,
    reportBy,
    provider;



grouped_by_id = GROUP cleaned_alerts BY id;

-- Hacemos un archivo csv filtrando las duplicadas, asi solo 
-- tenemos alertas unicas
unique_alerts_by_id = FOREACH grouped_by_id {
    first_alert_in_group = LIMIT cleaned_alerts 1;
    GENERATE FLATTEN(first_alert_in_group);
}


STORE unique_alerts_by_id INTO '/waze_incidents/final_unique_waze_alerts' USING PigStorage(',');