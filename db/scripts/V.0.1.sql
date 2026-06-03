CREATE SCHEMA air_monitoring;

CREATE TABLE air_monitoring.sensors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE air_monitoring.measurements (
    id BIGSERIAL PRIMARY KEY,
    sensor_id INTEGER NOT NULL REFERENCES air_monitoring.sensors(id) ON DELETE CASCADE,
    temperature REAL NOT NULL,
    humidity REAL NOT NULL,
    dust REAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_measurements_sensor_id
ON air_monitoring.measurements(sensor_id);

CREATE INDEX idx_measurements_created_at
ON air_monitoring.measurements(created_at);

INSERT INTO air_monitoring.sensors (name, latitude, longitude)
SELECT
    'Sensor-' || gs AS name,
    round((50.35 + random() * (50.55 - 50.35))::numeric, 5) AS latitude,
    round((30.30 + random() * (30.70 - 30.30))::numeric, 5) AS longitude
FROM generate_series(1, 100) AS gs;

ALTER TABLE air_monitoring.measurements
ADD COLUMN aqi REAL;


-- UPDATE air_monitoring.measurements
-- SET
--     temperature = -35,
--     humidity = 20,
--     dust = 10,
--     aqi = 20,
--     created_at = NOW()
-- WHERE id = (
--     SELECT id
--     FROM air_monitoring.measurements
--     WHERE sensor_id = 36
--     ORDER BY id DESC
--     LIMIT 1
-- );


DELETE FROM air_monitoring.measurements;