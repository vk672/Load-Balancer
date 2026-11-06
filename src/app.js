const express = require("express");
const { createRateLimiter } = require("./middleware/rateLimiter");
const { router: loadBalancerRoutes } = require("./routes/loadBalancerRoutes");
const { metrics } = require("./loadBalancer");

function createApp() {
  const app = express();

  app.locals.metrics = metrics;

  app.use(express.json());
  // body-parser 2 leaves req.body undefined when a request has no body.
  // Default it to an object so existing handlers can read body properties.
  app.use((req, res, next) => {
    if (req.body === undefined) {
      req.body = {};
    }

    return next();
  });
  app.use(createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 120
  }));

  app.get("/", (req, res) => {
    return res.json({
      name: "Load Balancer",
      algorithm: "consistent-hashing",
      endpoints: [
        "GET /route?ip=192.168.1.10",
        "POST /route",
        "POST /simulate",
        "GET /nodes",
        "GET /nodes/health",
        "POST /nodes",
        "PATCH /nodes/:id/health",
        "PATCH /nodes/:id/weight",
        "DELETE /nodes/:id",
        "GET /metrics",
        "GET /ring"
      ]
    });
  });

  app.get("/health", (req, res) => {
    return res.json({
      status: "ok",
      uptimeSeconds: Math.round(process.uptime())
    });
  });

  app.use("/", loadBalancerRoutes);

  app.use((req, res) => {
    return res.status(404).json({
      error: "Route not found."
    });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    const statusCode = error.statusCode || 500;

    return res.status(statusCode).json({
      error: error.message || "Internal server error."
    });
  });

  return app;
}

module.exports = { createApp };
