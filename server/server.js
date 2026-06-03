const express = require("express");
const path = require("path");
const {
    getSensorsDirectory,
    getMeasurementsDirectory,
    getDashboardSensors,
    getSensorHistory,
    getEventLog
} = require("./services/measurementService");
const { detectAnomalies } = require("./services/anomalyService");
require("./mqttHandler");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.get("/", async (req, res) => {
    try {
        const sensors = await getDashboardSensors();

        res.render("index", {
            pageTitle: "Інформаційна система для аналізу якості повітря в місті",
            sensors,
            sensorsJson: JSON.stringify(sensors).replace(/</g, "\\u003c"),
            mapError: null
        });
    } catch (error) {
        res.render("index", {
            pageTitle: "Інформаційна система для аналізу якості повітря в місті",
            sensors: [],
            sensorsJson: "[]",
            mapError: "Карта поки не може завантажити датчики."
        });
    }
});

app.get("/directories", async (req, res) => {
    try {
        const [sensors, measurements] = await Promise.all([
            getSensorsDirectory(),
            getMeasurementsDirectory(100)
        ]);

        res.render("directories", {
            pageTitle: "Довідники даних",
            sensors,
            measurements,
            error: null
        });
    } catch (error) {
        res.status(500).render("directories", {
            pageTitle: "Довідники даних",
            sensors: [],
            measurements: [],
            error: "Не вдалося завантажити дані з бази."
        });
    }
});

app.get("/events", async (req, res) => {
    try {
        const baseEvents = await getEventLog();
        let anomalyEvents = [];

        try {
            anomalyEvents = await detectAnomalies();
        } catch (error) {
            console.error("Anomaly detection error:", error);
        }

        const events = [...anomalyEvents, ...baseEvents];

        res.render("events", {
            pageTitle: "Журнал подій",
            events,
            error: null
        });
    } catch (error) {
        res.status(500).render("events", {
            pageTitle: "Журнал подій",
            events: [],
            error: "Не вдалося завантажити журнал подій. Перевірте, чи створена SQL-функція для журналу."
        });
    }
});

app.get("/api/sensors/:id/history", async (req, res) => {
    try {
        const sensorId = Number(req.params.id);
        const hours = Number(req.query.hours || 24);

        if (!Number.isInteger(sensorId) || sensorId <= 0) {
            res.status(400).json({ message: "Некоректний ідентифікатор датчика" });
            return;
        }

        const safeHours = [1, 6, 24].includes(hours) ? hours : 24;
        const history = await getSensorHistory(sensorId, safeHours);

        res.json(history);
    } catch (error) {
        res.status(500).json({
            message: "Не вдалося завантажити історію вимірювань датчика"
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
