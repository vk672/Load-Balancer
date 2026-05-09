function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60 * 1000;
  const maxRequests = options.maxRequests || 60;
  const buckets = new Map();

  return function rateLimiter(req, res, next) {
    const now = Date.now();
    const clientKey = req.ip || req.socket.remoteAddress || "unknown";
    const bucket = buckets.get(clientKey) || { count: 0, resetAt: now + windowMs };

    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    buckets.set(clientKey, bucket);

    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", Math.max(maxRequests - bucket.count, 0));
    res.setHeader("X-RateLimit-Reset", new Date(bucket.resetAt).toISOString());

    if (bucket.count > maxRequests) {
      if (req.app.locals.metrics) {
        req.app.locals.metrics.recordRateLimited();
      }

      return res.status(429).json({
        error: "Too many requests. Please try again later."
      });
    }

    return next();
  };
}

module.exports = { createRateLimiter };
