CREATE OR REPLACE FUNCTION air_monitoring.save_measurement(
    p_sensor_id INTEGER,
    p_temperature REAL,
    p_humidity REAL,
    p_dust REAL,
    p_created_at TIMESTAMP
)
RETURNS TABLE(success BOOLEAN, message TEXT)
AS
$$
DECLARE
    v_aqi REAL;
BEGIN

    -- Проверка существования датчика
    IF NOT EXISTS (
        SELECT 1 FROM air_monitoring.sensors
        WHERE id = p_sensor_id
    ) THEN
        RETURN QUERY SELECT FALSE, 'Sensor does not exist';
        RETURN;
    END IF;

    -- Проверка температуры
    IF p_temperature < -40 OR p_temperature > 60 THEN
        RETURN QUERY SELECT FALSE, 'Temperature out of range';
        RETURN;
    END IF;

    -- Проверка влажности
    IF p_humidity < 0 OR p_humidity > 100 THEN
        RETURN QUERY SELECT FALSE, 'Humidity out of range';
        RETURN;
    END IF;

    -- Проверка пыли
    IF p_dust < 0 OR p_dust > 500 THEN
        RETURN QUERY SELECT FALSE, 'Dust out of range';
        RETURN;
    END IF;

    -- Расчёт AQI
    v_aqi :=
        0.6 * p_dust +
        0.2 * p_humidity +
        0.2 * p_temperature;

    INSERT INTO air_monitoring.measurements
    (sensor_id, temperature, humidity, dust, aqi, created_at)
    VALUES
    (p_sensor_id, p_temperature, p_humidity, p_dust, v_aqi, p_created_at);

    RETURN QUERY SELECT TRUE, 'Measurement saved successfully';

END;
$$
LANGUAGE plpgsql;
