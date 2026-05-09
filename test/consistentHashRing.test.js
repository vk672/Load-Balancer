const assert = require("node:assert/strict");
const test = require("node:test");
const { ConsistentHashRing } = require("../src/services/ConsistentHashRing");

test("same IP always maps to the same node while membership is unchanged", () => {
  const ring = new ConsistentHashRing([
    { id: "Node-A" },
    { id: "Node-B" },
    { id: "Node-C" }
  ]);

  const first = ring.getNode("192.168.1.10").id;
  const second = ring.getNode("192.168.1.10").id;

  assert.equal(first, second);
});

test("unhealthy nodes are skipped", () => {
  const ring = new ConsistentHashRing([
    { id: "Node-A" },
    { id: "Node-B" }
  ]);

  ring.setNodeHealth("Node-A", false);

  for (let i = 0; i < 20; i++) {
    assert.equal(ring.getNode(`10.0.0.${i}`).id, "Node-B");
  }
});

test("adding one node only remaps part of the keyspace", () => {
  const ring = new ConsistentHashRing([
    { id: "Node-A" },
    { id: "Node-B" },
    { id: "Node-C" }
  ]);

  const ips = Array.from({ length: 500 }, (_, index) => `172.16.${Math.floor(index / 255)}.${index % 255}`);
  const before = new Map(ips.map((ip) => [ip, ring.getNode(ip).id]));

  ring.addNode({ id: "Node-D" });

  const changedCount = ips.filter((ip) => before.get(ip) !== ring.getNode(ip).id).length;

  assert.ok(changedCount > 0);
  assert.ok(changedCount < ips.length / 2);
});

test("weighted nodes receive more hash ring positions", () => {
  const ring = new ConsistentHashRing([
    { id: "Node-A", weight: 1 },
    { id: "Node-B", weight: 3 }
  ], {
    virtualNodesPerWeight: 10
  });

  const nodeACount = ring.ring.filter((point) => point.node.id === "Node-A").length;
  const nodeBCount = ring.ring.filter((point) => point.node.id === "Node-B").length;

  assert.equal(nodeACount, 10);
  assert.equal(nodeBCount, 30);
});
