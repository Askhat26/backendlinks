require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const errorHandler = require("./middleware/errorHandler");
const connectDB = require("./config/db");

const app = express();

// --------------- Middleware ---------------
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --------------- Routes ---------------
// server.js

app.use("/api/auth",       require("./routes/auth.routes"));
app.use("/api/profile",    require("./routes/profile.routes"));
app.use("/api/links",      require("./routes/links.routes"));
app.use("/api/analytics",  require("./routes/analytics.routes"));
app.use("/api/appearance", require("./routes/appearance.routes"));
app.use("/api/pdf-card",   require("./routes/pdfcard.routes"));
app.use("/api/public",     require("./routes/public.routes"));
app.use("/api/admin",      require("./routes/admin.routes"));   // NEW
app.use("/api/coupons",    require("./routes/coupon.routes"));  // NEW
// Health check
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", timestamp: new Date() })
);

// --------------- Error Handler ---------------
app.use(errorHandler);

// --------------- Start ---------------
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () =>
      console.log(`🚀 Server running on port ${PORT}`)
    );
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });