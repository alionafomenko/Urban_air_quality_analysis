CREATE OR REPLACE FUNCTION air_monitoring.get_measurements_directory(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
    id BIGINT,
    sensor_id INTEGER,
    sensor_name VARCHAR,
    temperature REAL,
    humidity REAL,
    dust REAL,
    aqi REAL,
    created_at TIMESTAMP WITHOUT TIME ZONE
)
LANGUAGE sql
AS $$
    SELECT
        m.id,
        m.sensor_id,
        s.name AS sensor_name,
        m.temperature,
        m.humidity,
        m.dust,
        m.aqi,
        m.created_at
    FROM air_monitoring.measurements m
    LEFT JOIN air_monitoring.sensors s ON s.id = m.sensor_id
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT GREATEST(p_limit, 1);
$$;
