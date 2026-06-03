const mqtt = require("mqtt");
const { saveMeasurement } = require("./services/measurementService");

const client = mqtt.connect("mqtt://localhost:1883");

client.on("connect", () => {
    console.log("Server connected to MQTT");
    client.subscribe("air/measurements");
});

client.on("message", async (topic, message) => {
    try {
        const data = JSON.parse(message.toString());

        console.log("Received:", data);

        const response = await saveMeasurement(data);

        if (!response.success) {
            console.warn("Rejected:", response.message);
        } else {
            console.log("Saved successfully");
        }

    } catch (error) {
        console.error("MQTT error:", error);
    }
});
