const crypto = require("crypto");
const { AppError } = require("../utils/AppError");

class ConsistentHashRing {
  constructor(nodes = [], options = {}) {
    this.virtualNodesPerWeight = options.virtualNodesPerWeight || 100;
    this.nodes = new Map();
    this.ring = [];

    nodes.forEach((node) => this.addNode(node));
  }

  addNode(node) {
    const normalizedNode = this.normalizeNode(node);

    if (this.nodes.has(normalizedNode.id)) {
      throw new AppError(`Node "${normalizedNode.id}" already exists.`, 409);
    }

    this.nodes.set(normalizedNode.id, normalizedNode);
    this.rebuildRing();
    return normalizedNode;
  }

  removeNode(nodeId) {
    const removed = this.nodes.delete(nodeId);
    this.rebuildRing();
    return removed;
  }

  setNodeHealth(nodeId, healthy) {
    const node = this.getExistingNode(nodeId);
    node.healthy = Boolean(healthy);
    this.rebuildRing();
    return node;
  }

  setNodeWeight(nodeId, weight) {
    const node = this.getExistingNode(nodeId);
    node.weight = this.normalizeWeight(weight);
    this.rebuildRing();
    return node;
  }

  getNode(key) {
    if (this.ring.length === 0) {
      throw new AppError("No healthy nodes are available.", 503);
    }

    const keyHash = this.hash(key);
    const index = this.findFirstRingIndex(keyHash);
    return this.ring[index].node;
  }

  getNodes() {
    return Array.from(this.nodes.values()).map((node) => ({ ...node }));
  }

  getHealthyNodes() {
    return this.getNodes().filter((node) => node.healthy);
  }

  getRingPreview(limit = 25) {
    return this.ring.slice(0, limit).map((point) => ({
      hash: point.hash,
      nodeId: point.node.id
    }));
  }

  rebuildRing() {
    const points = [];

    for (const node of this.nodes.values()) {
      if (!node.healthy) {
        continue;
      }

      const replicaCount = node.weight * this.virtualNodesPerWeight;

      for (let replica = 0; replica < replicaCount; replica++) {
        points.push({
          hash: this.hash(`${node.id}:${replica}`),
          node
        });
      }
    }

    points.sort((a, b) => a.hash - b.hash);
    this.ring = points;
  }

  findFirstRingIndex(hash) {
    let left = 0;
    let right = this.ring.length - 1;
    let answer = 0;

    while (left <= right) {
      const middle = Math.floor((left + right) / 2);

      if (this.ring[middle].hash >= hash) {
        answer = middle;
        right = middle - 1;
      } else {
        left = middle + 1;
      }
    }

    return left >= this.ring.length ? 0 : answer;
  }

  hash(value) {
    const digest = crypto.createHash("sha256").update(String(value)).digest("hex");
    return parseInt(digest.slice(0, 8), 16);
  }

  normalizeNode(node) {
    if (!node || typeof node.id !== "string" || node.id.trim() === "") {
      throw new AppError("Node id is required.", 400);
    }

    return {
      id: node.id.trim(),
      weight: this.normalizeWeight(node.weight ?? 1),
      healthy: node.healthy !== false
    };
  }

  normalizeWeight(weight) {
    const parsedWeight = Number(weight);

    if (!Number.isInteger(parsedWeight) || parsedWeight < 1) {
      throw new AppError("Node weight must be a positive integer.", 400);
    }

    return parsedWeight;
  }

  getExistingNode(nodeId) {
    const node = this.nodes.get(nodeId);

    if (!node) {
      throw new AppError(`Node "${nodeId}" was not found.`, 404);
    }

    return node;
  }
}

module.exports = { ConsistentHashRing };
