CREATE OR REPLACE FUNCTION air_monitoring.get_sensors_directory()
RETURNS TABLE (
    id INTEGER,
    name VARCHAR,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMP WITHOUT TIME ZONE
)
LANGUAGE sql
AS $$
    SELECT
        s.id,
        s.name,
        s.latitude,
        s.longitude,
        s.created_at
    FROM air_monitoring.sensors s
    ORDER BY s.id;
$$;
