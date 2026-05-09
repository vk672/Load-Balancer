const assert = require("node:assert/strict");
const test = require("node:test");
const {
  LoadBalancer,
  generateRandomIP,
  isValidIP
} = require("../src/loadBalancer");

test("assignment random IP generator returns valid IPv4 addresses", () => {
  for (let i = 0; i < 50; i++) {
    assert.equal(isValidIP(generateRandomIP()), true);
  }
});

test("LoadBalancer is deterministic for repeated IPs", () => {
  const ip = "203.0.113.42";

  assert.equal(LoadBalancer(ip), LoadBalancer(ip));
});

test("LoadBalancer rejects invalid IPs", () => {
  assert.throws(() => LoadBalancer("999.1.1.1"), /valid IPv4/);
});
