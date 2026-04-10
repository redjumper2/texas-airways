const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const { sanitize } = require("./middleware/validate");

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security ────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: ["http://localhost:5173", "http://localhost:3000", "https://texas-airways.vercel.app"], credentials: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: { error: "Too many requests, please try again later" },
});
app.use("/api/", limiter);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitize);

// ── Routes ──────────────────────────────────────────────────────────────
app.use("/api/technicians", require("./routes/technicians"));
app.use("/api/jobs", require("./routes/jobs"));
app.use("/api/schedule", require("./routes/schedule"));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), version: "1.0.0" });
});

// ── Serve frontend in production ────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
  });
}

// ── Global error handler ────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    ...(process.env.NODE_ENV !== "production" && { details: err.message }),
  });
});

// ── Start ───────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   Texas AirSystems API Server            ║
║   Running on http://localhost:${PORT}        ║
║   Environment: ${process.env.NODE_ENV || "development"}           ║
╚══════════════════════════════════════════╝
  `);
});

module.exports = app;
