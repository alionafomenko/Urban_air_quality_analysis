const mqtt = require("mqtt");

const MQTT_URL = "mqtt://localhost:1883";
const TOPIC = "air/measurements";

const SENSOR_COUNT = 100;
const HOURS = 24;
const STEP_MINUTES = 60;
const PUBLISH_DELAY_MS = 5;

const client = mqtt.connect(MQTT_URL);

function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

function round(value, digits = 1) {
    return Number(value.toFixed(digits));
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function createSensorProfiles() {
    return Array.from({ length: SENSOR_COUNT }, (_, index) => {
        return {
            sensorId: index + 1,
            temperatureOffset: randomBetween(-2, 2),
            humidityOffset: randomBetween(-6, 6),
            dustOffset: randomBetween(-8, 12)
        };
    });
}

function calculateTemperature(hour, profile) {
    const dayPhase = Math.sin(((hour - 6) / 24) * 2 * Math.PI);
    const baseTemperature = 15 + dayPhase * 7;
    const noise = randomBetween(-0.8, 0.8);

    return round(clamp(
        baseTemperature + profile.temperatureOffset + noise,
        -10,
        35
    ));
}

function calculateHumidity(hour, profile) {
    const dayPhase = Math.sin(((hour - 6) / 24) * 2 * Math.PI);
    const baseHumidity = 65 - dayPhase * 15;
    const noise = randomBetween(-5, 5);

    return round(clamp(
        baseHumidity + profile.humidityOffset + noise,
        20,
        95
    ));
}

function calculateDust(hour, profile) {
    const morningPeak = Math.exp(-Math.pow(hour - 8, 2) / 8);
    const eveningPeak = Math.exp(-Math.pow(hour - 18, 2) / 8);
    const baseDust = 25 + morningPeak * 20 + eveningPeak * 25;
    const noise = randomBetween(-5, 5);

    return round(clamp(
        baseDust + profile.dustOffset + noise,
        5,
        120
    ));
}

function createTimestamp(startDate, hourOffset) {
    const timestamp = new Date(startDate);
    timestamp.setMinutes(timestamp.getMinutes() + hourOffset * 60);

    return timestamp.toISOString().slice(0, 19);
}

function createMeasurement(profile, timestamp) {
    const date = new Date(timestamp);
    const hour = date.getHours() + date.getMinutes() / 60;

    return {
        sensor_id: profile.sensorId,
        temperature: calculateTemperature(hour, profile),
        humidity: calculateHumidity(hour, profile),
        dust: calculateDust(hour, profile),
        timestamp
    };
}

function publishMessage(payload) {
    return new Promise((resolve, reject) => {
        client.publish(TOPIC, JSON.stringify(payload), { qos: 0 }, (error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateHistory() {
    const profiles = createSensorProfiles();
    const now = new Date();
    const startDate = new Date(now);
    startDate.setHours(now.getHours() - HOURS, 0, 0, 0);

    let publishedCount = 0;

    console.log(`Generating ${HOURS} hours of history for ${SENSOR_COUNT} sensors`);
    console.log(`MQTT broker: ${MQTT_URL}`);
    console.log(`Topic: ${TOPIC}`);
    console.log('{\n' +
        '  "sensor_id": 12,\n' +
        '  "temperature": 21.4,\n' +
        '  "humidity": 58.2,\n' +
        '  "dust": 43.7,\n' +
        '  "timestamp": "2026-05-18T10:30:00"\n' +
        '}')

    for (let step = 0; step < HOURS * (60 / STEP_MINUTES); step += 1) {
        const timestamp = createTimestamp(startDate, step * (STEP_MINUTES / 60));

        for (const profile of profiles) {
            const payload = createMeasurement(profile, timestamp);

            await publishMessage(payload);
            publishedCount += 1;

            if (PUBLISH_DELAY_MS > 0) {
                await sleep(PUBLISH_DELAY_MS);
            }
        }
    }

    console.log(`Published ${publishedCount} measurements`);
    client.end();
}

client.on("connect", async () => {
    console.log("Connected to MQTT broker");

    try {
        await generateHistory();
        console.log("History generation completed");
    } catch (error) {
        console.error("Simulation failed:", error);
    } finally {
        client.end();
    }
});

client.on("error", (error) => {
    console.error("MQTT connection error:", error);
});


