const axios = require("axios");
const launchesDatabase = require("./launches.mongo");
const planets = require("./planets.mongo");

// when we launched two launches, the upcoming only showed the 2nd launch b/c launches was saved on different server and they
// don't communicate with each other. So, we need to save our launches on a database

const DEFAULT_FLIGHT_NUMBER = 100;

const SPACEX_API_URL = "https://api.spacexdata.com/v5/launches/query";

async function loadLaunchData() {
    const firstLaunch = await findLaunch({
        flightNumber: 1,
        rocket: "Falcon 1",
        mission: "FalconSat",
    });

    if (firstLaunch) {
        console.log("Launch data was already loaded");
    } else {
        populateLaunch();
    }
}

async function populateLaunch() {
    console.log("Downloading launch data...");

    const response = await axios.post(SPACEX_API_URL, {
        query: {},
        options: {
            pagination: false,
            populate: [
                {
                    path: "rocket",
                    select: {
                        name: 1,
                    },
                },
                {
                    path: "payloads",
                    select: {
                        customers: 1,
                    },
                },
            ],
        },
    });

    if (response.status !== 200) {
        console.log("Problem loading launch data");
        throw new Error("Launch data download failed");
    }

    const launchDocs = response.data.docs;
    for (const launchDoc of launchDocs) {
        const payloads = launchDoc["payloads"];
        const customers = payloads.flatMap((payload) => {
            return payload["customers"];
        });

        const launch = {
            flightNumber: launchDoc["flight_number"],
            mission: launchDoc["name"],
            rocket: launchDoc["rocket"]["name"],
            launchDate: launchDoc["date_local"],
            // target: "Kepler-442 b", // not applicable
            upcoming: launchDoc["upcoming"],
            success: launchDoc["success"],
            customers,
        };

        console.log(`${launch.flightNumber} ${launch.mission}`);

        //populate launches collection...
        await saveLaunch(launch);
    }
}

async function getAllLaunches(skip, limit) {
    // {} means find including everything
    return await launchesDatabase
        .find(
            {},
            {
                _id: 0,
                __v: 0,
            }
        )
        .sort({ flightNumber: 1 })
        .skip(skip)
        .limit(limit);
}

async function saveLaunch(launch) {
    await launchesDatabase.findOneAndUpdate(
        {
            flightNumber: launch.flightNumber,
        },
        launch,
        {
            upsert: true,
        }
    );
}

async function scheduleNewLaunch(launch) {
    const planet = await planets.findOne({
        keplerName: launch.target,
    });

    if (!planet) {
        throw new Error("No matching planet found");
    }

    const newFlightNumber = (await getLatestFlightNumber()) + 1;

    const newLaunch = Object.assign(launch, {
        success: true,
        upcoming: true,
        customers: ["CT", "NASA"],
        flightNumber: newFlightNumber,
    });

    await saveLaunch(newLaunch);
}

async function findLaunch(filter) {
    return await launchesDatabase.findOne(filter);
}

async function existsLaunchWithId(launchID) {
    return await findLaunch({
        flightNumber: launchID,
    });
}

async function getLatestFlightNumber() {
    // sort and pick the first one in the array => array in descending order
    const latestLaunch = await launchesDatabase.findOne().sort("-flightNumber");

    if (!latestLaunch) {
        return DEFAULT_FLIGHT_NUMBER;
    }

    return latestLaunch.flightNumber;
}

async function abortLaunchById(launchID) {
    const aborted = await launchesDatabase.updateOne(
        {
            flightNumber: launchID,
        },
        {
            upcoming: false,
            success: false,
        }
    );

    return aborted.modifiedCount == 1;
}

module.exports = {
    existsLaunchWithId,
    getAllLaunches,
    scheduleNewLaunch,
    abortLaunchById,
    loadLaunchData,
};
