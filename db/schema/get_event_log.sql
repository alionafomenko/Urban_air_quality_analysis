CREATE OR REPLACE FUNCTION air_monitoring.get_event_log()
RETURNS TABLE (
    event_type TEXT,
    severity TEXT,
    title TEXT,
    sensor_id INTEGER,
    sensor_name VARCHAR,
    message TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE
)
LANGUAGE sql
AS $$
    WITH latest AS (
        SELECT
            s.id AS sensor_id,
            s.name AS sensor_name,
            m.dust,
            m.created_at,
            LAG(m.dust) OVER (
                PARTITION BY s.id
                ORDER BY m.created_at
            ) AS previous_dust
        FROM air_monitoring.sensors s
        LEFT JOIN air_monitoring.measurements m ON m.sensor_id = s.id
    ),
    current_state AS (
        SELECT DISTINCT ON (sensor_id)
            sensor_id,
            sensor_name,
            dust,
            previous_dust,
            created_at
        FROM latest
        ORDER BY sensor_id, created_at DESC NULLS LAST
    )
    SELECT
        'high_pollution' AS event_type,
        'critical' AS severity,
        'Високе забруднення' AS title,
        sensor_id,
        sensor_name,
        'Зафіксовано високе забруднення повітря на ' || sensor_name AS message,
        created_at
    FROM current_state
    WHERE dust >= 75

    UNION ALL

    SELECT
        'no_data' AS event_type,
        'warning' AS severity,
        'Датчик без даних' AS title,
        sensor_id,
        sensor_name,
        sensor_name || ' не передавав дані понад 24 години' AS message,
        created_at
    FROM current_state
    WHERE created_at IS NULL
       OR created_at < (NOW() - INTERVAL '24 hours')::timestamp

    UNION ALL

    SELECT
        'normalization' AS event_type,
        'success' AS severity,
        'Нормалізація стану' AS title,
        sensor_id,
        sensor_name,
        'Рівень забруднення на ' || sensor_name || ' знизився до середнього' AS message,
        created_at
    FROM current_state
    WHERE previous_dust >= 75
      AND dust >= 35
      AND dust < 75

    ORDER BY created_at DESC NULLS LAST, severity;
$$;
