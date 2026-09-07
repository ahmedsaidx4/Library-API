const express = require("express");
const morgan = require("morgan");

const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config({ path: "config.env" });
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser"); // ميدل وير بيقرأ الكوكيز من الهيدر ويحطها في req.cookies
const app = express();
exports.app = app;
app.use(express.json());
app.use(cookieParser()); // لازم يشتغل قبل الراوتس عشان /refresh و /logout يلاقوا الكوكي
app.use(morgan("tiny"));
const httpStatusText = require("./utils/httpStatusText");
mongoose.connect(process.env.MONGO_URL).then(() => {
  console.log("server is connected DataBase ");
});

//-----------------------------------------------------------------------

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Library API",
      version: "1.0.0",
      description: "A simple Express User API",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
  },
  apis: ["./routes/*.js"], // Path to the API routes folders
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

//-----------------------------------------------------------------------

const userRoute = require("./routes/user.route");
const borrowRoute = require("./routes/borrow.route");
const authorRoute = require("./routes/author.route");
const categoryRoute = require("./routes/category.route");
const bookRoute = require("./routes/book.route");

app.use("/api/users", userRoute);
app.use("/api/borrows", borrowRoute);
app.use("/api/authors", authorRoute);
app.use("/api/categorys", categoryRoute);
app.use("/api/books", bookRoute);

app.use((req, res, next) => {
  return res
    .status(404)
    .json({ status: httpStatusText.ERROR, message: "This URL Not Found" });
});

app.use((error, req, res, next) => {
  return res.status(error.statusCode || 500).json({
    status: error.statusText || httpStatusText.ERROR,
    message: error.message,
    Code: error.statusCode,
  });
});

const server = app.listen(process.env.PORT, () => {
  console.log(`Server is Running on Port ${process.env.PORT}`);
});

const shutDown = async () => {
  console.log("Server shut down...");
  server.close(async () => {
    console.log("Server Closed");
    await mongoose.connection.close();
    console.log("MongoDB connection closed");

    process.exit(0);
  });
};
process.on("SIGTERM", shutDown);
process.on("SIGINT", shutDown);
