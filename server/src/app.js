const path = require("path");
const express = require("express");
const cors = require("cors");

const api = require("./routes/api");

const morgan = require("morgan");

// start the server at app
const app = express();

// cors to connect backend and front end (whitelist: allowing front end to retrieve back end data)
app.use(
    cors({
        origin: "http://localhost:3000",
    })
);

// Morgan is used for logging activities
app.use(morgan("combined"));

// express.json() help we get data by req.body
app.use(express.json());

// get the front-end
app.use(express.static(path.join(__dirname, "..", "public")));

app.use("/v1", api);

app.get("/*", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

module.exports = app;
