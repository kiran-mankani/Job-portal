// ==========================================
// LOAD ENVIRONMENT VARIABLES
// ==========================================

const dotenv = require("dotenv");

dotenv.config();

// ==========================================
// IMPORT APP
// ==========================================

const app = require("./app");

// ==========================================
// IMPORT DATABASE CONNECTION
// ==========================================

const connectDB = require("./config/db");

// ==========================================
// SERVER CONFIGURATION
// ==========================================

const PORT = Number(process.env.PORT) || 5000;

// ==========================================
// START SERVER
// ==========================================

const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();

    console.log(`Server Port: ${PORT}`);

    // Start Express server
    app.listen(PORT, () => {
      console.log(
        `Server running on http://localhost:${PORT}`
      );

      console.log(
        `Swagger Docs: http://localhost:${PORT}/api-docs`
      );
    });
  } catch (error) {
    console.error(
      "Server Startup Error:",
      error.message
    );

    process.exit(1);
  }
};

// ==========================================
// START APPLICATION
// ==========================================

startServer();