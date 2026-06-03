CREATE OR REPLACE FUNCTION air_monitoring.get_sensor_measurements_history(
    p_sensor_id integer,
    p_hours integer DEFAULT 24
)
RETURNS TABLE(
    id bigint,
    sensor_id integer,
    temperature real,
    humidity real,
    dust real,
    aqi real,
    created_at timestamp without time zone
)
LANGUAGE sql
AS $$
    WITH latest_measurement AS (
        SELECT MAX(m.created_at) AS latest_created_at
        FROM air_monitoring.measurements m
        WHERE m.sensor_id = p_sensor_id
    )
    SELECT
        m.id,
        m.sensor_id,
        m.temperature,
        m.humidity,
        m.dust,
        m.aqi,
        m.created_at
    FROM air_monitoring.measurements m
    CROSS JOIN latest_measurement lm
    WHERE m.sensor_id = p_sensor_id
      AND lm.latest_created_at IS NOT NULL
      AND m.created_at >= lm.latest_created_at - make_interval(hours => GREATEST(p_hours, 1))
    ORDER BY m.created_at ASC NULLS LAST, m.id ASC
    LIMIT 300;
$$;