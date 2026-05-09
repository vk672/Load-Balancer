const {
  LoadBalancer,
  generateRandomIP,
  hashRing,
  isValidIP,
  metrics,
  simulateTraffic
} = require("../loadBalancer");

function routeRequest(req, res, next) {
  try {
    const ip = req.query.ip || req.body.ip || generateRandomIP();
    const selectedNode = LoadBalancer(ip);

    return res.json({
      ip,
      selectedNode,
      algorithm: "consistent-hashing"
    });
  } catch (error) {
    return next(error);
  }
}

function simulateRequests(req, res, next) {
  try {
    const requestCount = Number(req.body.requestCount || 10);

    if (!Number.isInteger(requestCount) || requestCount < 1 || requestCount > 1000) {
      return res.status(400).json({
        error: "requestCount must be an integer between 1 and 1000."
      });
    }

    return res.json({
      requestCount,
      results: simulateTraffic(requestCount)
    });
  } catch (error) {
    return next(error);
  }
}

function listNodes(req, res) {
  const nodes = hashRing.getNodes();
  const healthyNodes = hashRing.getHealthyNodes();

  return res.json({
    totalNodes: nodes.length,
    healthyNodeCount: healthyNodes.length,
    nodes,
    healthyNodes
  });
}

function listNodeHealth(req, res) {
  return res.json({
    nodes: hashRing.getNodes().map((node) => ({
      id: node.id,
      healthy: node.healthy
    }))
  });
}

function addNode(req, res, next) {
  try {
    const node = hashRing.addNode({
      id: req.body.id,
      weight: req.body.weight,
      healthy: req.body.healthy
    });

    return res.status(201).json({ node });
  } catch (error) {
    return next(error);
  }
}

function removeNode(req, res, next) {
  try {
    const removed = hashRing.removeNode(req.params.id);

    if (!removed) {
      return res.status(404).json({
        error: `Node "${req.params.id}" was not found.`
      });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

function updateNodeHealth(req, res, next) {
  try {
    if (typeof req.body.healthy !== "boolean") {
      return res.status(400).json({
        error: "healthy must be true or false."
      });
    }

    const node = hashRing.setNodeHealth(req.params.id, req.body.healthy);
    return res.json({ node });
  } catch (error) {
    return next(error);
  }
}

function updateNodeWeight(req, res, next) {
  try {
    const node = hashRing.setNodeWeight(req.params.id, req.body.weight);
    return res.json({ node });
  } catch (error) {
    return next(error);
  }
}

function getMetrics(req, res) {
  return res.json({
    ...metrics.snapshot(),
    nodes: {
      total: hashRing.getNodes().length,
      healthy: hashRing.getHealthyNodes().length,
      virtualNodeCount: hashRing.ring.length
    }
  });
}

function resetMetrics(req, res) {
  metrics.reset();
  return res.status(204).send();
}

function getRing(req, res) {
  const limit = Number(req.query.limit || 25);
  const safeLimit = Number.isInteger(limit) && limit > 0 && limit <= 500 ? limit : 25;

  return res.json({
    algorithm: "consistent-hashing",
    virtualNodesPerWeight: hashRing.virtualNodesPerWeight,
    virtualNodeCount: hashRing.ring.length,
    preview: hashRing.getRingPreview(safeLimit)
  });
}

function validateIP(req, res) {
  return res.json({
    ip: req.body.ip,
    valid: isValidIP(req.body.ip)
  });
}

module.exports = {
  addNode,
  getMetrics,
  getRing,
  listNodeHealth,
  listNodes,
  removeNode,
  resetMetrics,
  routeRequest,
  simulateRequests,
  updateNodeHealth,
  updateNodeWeight,
  validateIP
};
