const { getDashboardSensors } = require("./measurementService");

const Z_CRITICAL = 3;
const LOCAL_RADIUS_KM = 5;
const MIN_NEARBY_SENSORS = 2;
const MIN_HIGH_POLLUTION_NEARBY_SENSORS = 1;

const PARAMETERS = [
    {
        key: "temperature",
        label: "температури",
        displayName: "температура",
        unit: " °C",
        dust: false
    },
    {
        key: "humidity",
        label: "вологості",
        displayName: "вологість",
        unit: " %",
        dust: false
    },
    {
        key: "dust",
        label: "рівня пилу",
        displayName: "пил",
        unit: "",
        dust: true
    },
    {
        key: "aqi",
        label: "AQI",
        displayName: "AQI",
        unit: "",
        dust: false
    }
];

function calculateMean(values) {
    if (values.length === 0) {
        return null;
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateStd(values, mean) {
    if (values.length < 2 || mean === null) {
        return 0;
    }

    const variance = values.reduce((sum, value) => {
        return sum + Math.pow(value - mean, 2);
    }, 0) / values.length;

    return Math.sqrt(variance);
}

function calculateZScore(value, mean, std) {
    if (std === 0 || mean === null) {
        return 0;
    }

    return (value - mean) / std;
}

function getNumericValue(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const numericValue = Number(value);

    return Number.isFinite(numericValue) ? numericValue : null;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
    const earthRadiusKm = 6371;
    const toRadians = (degrees) => degrees * Math.PI / 180;
    const latitudeDelta = toRadians(lat2 - lat1);
    const longitudeDelta = toRadians(lon2 - lon1);

    const a = Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2)
        + Math.cos(toRadians(lat1))
        * Math.cos(toRadians(lat2))
        * Math.sin(longitudeDelta / 2)
        * Math.sin(longitudeDelta / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusKm * c;
}

function getNearbySensors(sensor, sensors, radiusKm = LOCAL_RADIUS_KM) {
    const sensorLatitude = Number(sensor.latitude);
    const sensorLongitude = Number(sensor.longitude);

    if (!Number.isFinite(sensorLatitude) || !Number.isFinite(sensorLongitude)) {
        return [];
    }

    return sensors.filter((item) => {
        if (String(item.id) === String(sensor.id)) {
            return false;
        }

        const latitude = Number(item.latitude);
        const longitude = Number(item.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return false;
        }

        return haversineDistance(sensorLatitude, sensorLongitude, latitude, longitude) <= radiusKm;
    });
}

function formatValue(value, unit) {
    return `${Number(value).toFixed(1)}${unit}`;
}

function createAnomalyEvent(sensor, parameter, value, zScore) {
    return {
        event_type: "anomaly",
        severity: "info",
        title: "Аномальне вимірювання",
        sensor_name: sensor.name || `Sensor-${sensor.id}`,
        message: `Зафіксовано нетипове значення показника "${parameter.displayName}": ${formatValue(value, parameter.unit)}. Нормоване відхилення z = ${zScore.toFixed(2)}.`,
        created_at: sensor.last_measurement_at || new Date().toISOString()
    };
}

function createLocalPollutionEvent(sensor, parameter, value, zScore) {
    return {
        event_type: "local_pollution",
        severity: "warning",
        title: "Локальне забруднення",
        sensor_name: sensor.name || `Sensor-${sensor.id}`,
        message: `Підвищений ${parameter.displayName} підтверджується сусідніми датчиками. Значення датчика: ${formatValue(value, parameter.unit)}, z = ${zScore.toFixed(2)}.`,
        created_at: sensor.last_measurement_at || new Date().toISOString()
    };
}

function hasLocalConfirmation(sensor, sensors, parameter, globalMean, globalStd) {
    const nearbySensors = getNearbySensors(sensor, sensors)
        .filter((item) => getNumericValue(item[parameter.key]) !== null);

    if (nearbySensors.length < MIN_NEARBY_SENSORS) {
        return false;
    }

    const nearbyValues = nearbySensors.map((item) => getNumericValue(item[parameter.key]));
    const localMean = calculateMean(nearbyValues);
    const localStd = calculateStd(nearbyValues, localMean);
    const value = getNumericValue(sensor[parameter.key]);

    if (parameter.dust) {
        return nearbySensors.filter((item) => item.pollution_level === "high").length
            >= MIN_HIGH_POLLUTION_NEARBY_SENSORS;
    }

    const localZ = calculateZScore(value, localMean, localStd);

    if (localStd > 0) {
        return Math.abs(localZ) <= Z_CRITICAL;
    }

    return Math.abs(value - localMean) <= globalStd;
}

async function detectAnomalies() {
    const sensors = await getDashboardSensors();
    const events = [];
    const localPollutionSensorIds = new Set();

    PARAMETERS.forEach((parameter) => {
        const values = sensors
            .map((sensor) => getNumericValue(sensor[parameter.key]))
            .filter((value) => value !== null);

        const mean = calculateMean(values);
        const std = calculateStd(values, mean);

        if (values.length < 3 || std === 0 || mean === null) {
            return;
        }

        sensors.forEach((sensor) => {
            const value = getNumericValue(sensor[parameter.key]);

            if (value === null) {
                return;
            }

            const zScore = calculateZScore(value, mean, std);
            const exceedsLimit = parameter.dust
                ? zScore > Z_CRITICAL
                : Math.abs(zScore) > Z_CRITICAL;

            if (!exceedsLimit) {
                return;
            }

            const locallyConfirmed = hasLocalConfirmation(sensor, sensors, parameter, mean, std);

            if (parameter.dust && locallyConfirmed) {
                localPollutionSensorIds.add(String(sensor.id));
                events.push(createLocalPollutionEvent(sensor, parameter, value, zScore));
                return;
            }
            if (parameter.key === "aqi" && localPollutionSensorIds.has(String(sensor.id))) {
                return;
            }
            if (!locallyConfirmed) {
                events.push(createAnomalyEvent(sensor, parameter, value, zScore));
            }
        });
    });
    return events.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
}

module.exports = {
    calculateMean,
    calculateStd,
    calculateZScore,
    haversineDistance,
    getNearbySensors,
    getNumericValue,
    detectAnomalies
};
