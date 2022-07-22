const http = require("http");
require("dotenv").config();

const app = require("./app");
const { log } = require("console");
const { mongoConnect } = require("./services/mongo");
const { loadPlanetsData } = require("./models/planets.model");
const { loadLaunchData } = require("./models/launches.model");

const PORT = process.env.PORT || 8000;

const server = http.createServer(app);

async function startServer() {
    await mongoConnect();
    await loadPlanetsData();
    await loadLaunchData();

    server.listen(PORT, () => {
        console.log(`Listening on ${PORT}...`);
    });
}

// we dont need async here b/c there is no more needed to run after calling the function
startServer();
