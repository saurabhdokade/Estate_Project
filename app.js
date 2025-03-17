const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const cors = require('cors');

// Middlewares
const errorMiddleware = require("./middlewares/error");
const userRoutes = require("./routes/customeRoutes");
const chatRoutes = require("./routes/chatRoutes")
const enquiryRoutes = require("./routes/enquiryRoutes")
const visitRoutes = require("./routes/visitRoutes")
const agentRoutes = require("./routes/agentRoutes");
const builderRoutes = require("./routes/builderRoutes");
const propertyRoutes = require("./routes/propertyRoutes");
const SubscriptionRoutes = require("./routes/subscriptionRoute");
const adminRoutes = require("./routes/adminRoutes")
// Initialize Express App
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "*", credentials: true }));


// Routes
app.use("/api/v1", userRoutes);
app.use("/api/v1",chatRoutes);
app.use("/api/v1",enquiryRoutes);
app.use("/api/v1",visitRoutes);
app.use("/api/v1",agentRoutes);
app.use("/api/v1",builderRoutes);
app.use("/api/v1",propertyRoutes);
app.use("/api/v1/",SubscriptionRoutes);
app.use("/api/v1/",adminRoutes)
// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
  keyGenerator: (req) => req.ip,
});
app.use(limiter);

// Error Handling
app.use(errorMiddleware);

module.exports = app;
