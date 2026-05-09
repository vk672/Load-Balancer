const { LoadBalancer, generateRandomIP, simulateTraffic } = require("./loadBalancer");

console.log("Running simulation for 10 random requests...");
simulateTraffic(10);

const repeatedIP = generateRandomIP();
const firstNode = LoadBalancer(repeatedIP);
const secondNode = LoadBalancer(repeatedIP);

console.log("");
console.log("Determinism check:");
console.log(`${repeatedIP} routed to ${firstNode} first, then ${secondNode} again.`);
