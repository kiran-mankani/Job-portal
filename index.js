// ==========================================
// IMPORT PACKAGES
// ==========================================

const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// Swagger packages
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

// ==========================================
// LOAD ENVIRONMENT VARIABLES
// ==========================================

dotenv.config();
console.log("JWT_SECRET loaded:", !!process.env.JWT_SECRET);

// ==========================================
// IMPORT ROUTES
// ==========================================

const authRoutes = require("./routes/authRoutes");
const jobRoutes = require("./routes/jobRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const interviewRoutes = require("./routes/interviewRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const adminRoutes = require("./routes/adminRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

// ==========================================
// CREATE EXPRESS APP
// ==========================================

const app = express();

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// ==========================================
// SWAGGER CONFIGURATION
// ==========================================

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "Recruitment / Job Portal API",
      version: "1.0.0",
      description:
        "REST API documentation for the Recruitment / Job Portal",
    },

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },

    servers: [
      {
        url: "http://localhost:5000",
        description: "Local Development Server",
      },
    ],
  },

  apis: ["./routes/*.js", "./controllers/*.js"],
};

// ==========================================
// GENERATE SWAGGER DOCUMENTATION
// ==========================================

const swaggerSpec = swaggerJsdoc(swaggerOptions);
console.log(
  "POST JOB SECURITY:",
  swaggerSpec.paths?.["/api/jobs"]?.post?.security
);

console.log(
  "SECURITY SCHEMES:",
  swaggerSpec.components?.securitySchemes
);

// ==========================================
// SWAGGER UI
// ==========================================

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

// ==========================================
// TEST ROUTE
// ==========================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Job Portal Backend is running!",
  });
});

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

app.use("/api/auth", authRoutes);

// ==========================================
// JOB ROUTES
// ==========================================

app.use("/api/jobs", jobRoutes);

// ==========================================
// APPLICATION ROUTES
// ==========================================

app.use("/api/applications", applicationRoutes);

// ==========================================
// INTERVIEW ROUTES
// ==========================================

app.use("/api/interviews", interviewRoutes);

// ==========================================
// DASHBOARD ROUTES
// ==========================================

app.use("/api/dashboard", dashboardRoutes);

// ==========================================
// ADMIN ROUTES
// ==========================================

app.use("/api/admin", adminRoutes);

// ==========================================
// NOTIFICATION ROUTES
// ==========================================

app.use("/api/notifications", notificationRoutes);

// ==========================================
// MONGODB CONNECTION
// ==========================================

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/job-portal";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected: 127.0.0.1");

    // ==========================================
    // START SERVER
    // ==========================================

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(
        `Swagger Docs: http://localhost:${PORT}/api-docs`
      );
    });
  })
  .catch((error) => {
    console.error(
      "MongoDB Connection Error:",
      error.message
    );
  });