CREATE OR REPLACE FUNCTION air_monitoring.get_dashboard_sensors()
RETURNS TABLE (
    id INTEGER,
    name VARCHAR,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    temperature REAL,
    humidity REAL,
    dust REAL,
    aqi REAL,
    pollution_level TEXT,
    last_measurement_at TIMESTAMP WITHOUT TIME ZONE
)
LANGUAGE sql
AS $$
    SELECT
        s.id,
        s.name,
        s.latitude,
        s.longitude,
        m.temperature,
        m.humidity,
        m.dust,
        m.aqi,
        CASE
            WHEN m.dust IS NULL THEN 'no_data'
            WHEN m.dust < 35 THEN 'low'
            WHEN m.dust < 75 THEN 'medium'
            ELSE 'high'
        END AS pollution_level,
        m.created_at AS last_measurement_at
    FROM air_monitoring.sensors s
    LEFT JOIN LATERAL (
        SELECT
            temperature,
            humidity,
            dust,
            aqi,
            created_at
        FROM air_monitoring.measurements
        WHERE sensor_id = s.id
        ORDER BY created_at DESC NULLS LAST, id DESC
        LIMIT 1
    ) m ON TRUE
    ORDER BY s.id;
$$;
