const pool = require("../db");

async function saveMeasurement(data) {
    try {
        const result = await pool.query(
            `
            SELECT * FROM air_monitoring.save_measurement(
                $1, $2, $3, $4, $5
            )
            `,
            [
                data.sensor_id,
                data.temperature,
                data.humidity,
                data.dust,
                data.timestamp
            ]
        );

        return result.rows[0];

    } catch (error) {
        console.error("DB error:", error);
        return {
            success: false,
            message: "Database error"
        };
    }
}

async function getSensorsDirectory() {
    try {
        const result = await pool.query(`
            SELECT * FROM air_monitoring.get_sensors_directory()
        `);

        return result.rows;

    } catch (error) {
        console.error("DB error:", error);
        throw error;
    }
}

async function getMeasurementsDirectory(limit = 100) {
    try {
        const result = await pool.query(
            `
            SELECT * FROM air_monitoring.get_measurements_directory($1)
            `,
            [limit]
        );

        return result.rows;

    } catch (error) {
        console.error("DB error:", error);
        throw error;
    }
}

async function getDashboardSensors() {
    try {
        const result = await pool.query(`
            SELECT * FROM air_monitoring.get_dashboard_sensors()
        `);

        return result.rows;

    } catch (error) {
        console.error("DB error:", error);
        throw error;
    }
}

async function getSensorHistory(sensorId, hours = 24) {
    try {
        const result = await pool.query(
            `
            SELECT * FROM air_monitoring.get_sensor_measurements_history($1, $2)
            `,
            [sensorId, hours]
        );

        return result.rows;

    } catch (error) {
        console.error("DB error:", error);
        throw error;
    }
}

async function getEventLog() {
    try {
        const result = await pool.query(`
            SELECT * FROM air_monitoring.get_event_log()
        `);

        return result.rows;

    } catch (error) {
        console.error("DB error:", error);
        throw error;
    }
}

module.exports = {
    saveMeasurement,
    getSensorsDirectory,
    getMeasurementsDirectory,
    getDashboardSensors,
    getSensorHistory,
    getEventLog
};
