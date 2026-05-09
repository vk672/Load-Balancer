const { ConsistentHashRing } = require("./services/ConsistentHashRing");
const { MetricsStore } = require("./services/MetricsStore");
const { defaultNodes } = require("./config/defaultNodes");
const { AppError } = require("./utils/AppError");

// Random IP generator from the assignment PDF.
function generateRandomIP() {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join(".");
}

// List of nodes from the assignment PDF, represented with health and weight metadata.
const nodes = defaultNodes;

// Identify which node received the request. Kept from the assignment flow.
function identifyNode(ip, selectedNode) {
  console.log(`Incoming IP: ${ip} -> Routed to: ${selectedNode}`);
}

const hashRing = new ConsistentHashRing(nodes, {
  virtualNodesPerWeight: 100
});

const metrics = new MetricsStore();

function isValidIP(ip) {
  if (typeof ip !== "string") {
    return false;
  }

  const parts = ip.split(".");

  return parts.length === 4 && parts.every((part) => {
    if (!/^\d+$/.test(part)) {
      return false;
    }

    const value = Number(part);
    return value >= 0 && value <= 255;
  });
}

// Redesigned load balancer function using consistent hashing instead of random selection.
function LoadBalancer(ip) {
  if (!isValidIP(ip)) {
    metrics.recordFailure();
    throw new AppError("A valid IPv4 address is required.", 400);
  }

  const selectedNode = hashRing.getNode(ip).id;

  // Keep this code to identify which node received the request.
  identifyNode(ip, selectedNode);
  metrics.recordRoute(ip, selectedNode);
  return selectedNode;
}

function simulateTraffic(requestCount = 5) {
  const results = [];

  for (let i = 0; i < requestCount; i++) {
    const ip = generateRandomIP();
    const selectedNode = LoadBalancer(ip);
    results.push({ ip, selectedNode });
  }

  return results;
}

module.exports = {
  LoadBalancer,
  generateRandomIP,
  hashRing,
  identifyNode,
  isValidIP,
  metrics,
  nodes,
  simulateTraffic
};
