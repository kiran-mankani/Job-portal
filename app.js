

const express = require("express");

const authRoutes = require("./routes/authRoutes");

const app = express();

// JSON data receive karne ke liye
app.use(express.json());

// Authentication routes
app.use("/api/auth", authRoutes);

// Test route
app.get("/", (req, res) => {
    res.send("Recruitment API is running");
});

module.exports = app;