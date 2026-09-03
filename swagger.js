const swaggerJsdoc = require("swagger-jsdoc");

// Swagger configuration
const options = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "Recruitment Job Portal API",
      version: "1.0.0",
      description: "Recruitment Job Portal REST APIs",
    },

    servers: [
      {
        url: "http://localhost:5000",
        description: "Local development server",
      },
    ],
  },

  // Swagger routes ke andar @swagger comments ko read karega
  apis: ["./routes/*.js"],
};

// Swagger specification generate
const swaggerSpec = swaggerJsdoc(options);

// Sirf swagger specification export hogi
module.exports = swaggerSpec;