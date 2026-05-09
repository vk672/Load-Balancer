class MetricsStore {
  constructor() {
    this.totalRequests = 0;
    this.routedRequests = {};
    this.rateLimitedRequests = 0;
    this.failedRequests = 0;
    this.recentRequests = [];
  }

  recordRoute(ip, nodeId) {
    this.totalRequests += 1;
    this.routedRequests[nodeId] = (this.routedRequests[nodeId] || 0) + 1;
    this.recentRequests.unshift({
      ip,
      nodeId,
      routedAt: new Date().toISOString()
    });
    this.recentRequests = this.recentRequests.slice(0, 20);
  }

  recordRateLimited() {
    this.rateLimitedRequests += 1;
  }

  recordFailure() {
    this.failedRequests += 1;
  }

  snapshot() {
    return {
      totalRequests: this.totalRequests,
      routedRequests: { ...this.routedRequests },
      rateLimitedRequests: this.rateLimitedRequests,
      failedRequests: this.failedRequests,
      recentRequests: [...this.recentRequests]
    };
  }

  reset() {
    this.totalRequests = 0;
    this.routedRequests = {};
    this.rateLimitedRequests = 0;
    this.failedRequests = 0;
    this.recentRequests = [];
  }
}

module.exports = { MetricsStore };
