# Load Balancer

A Node.js and Express backend that routes incoming requests using consistent hashing instead of random selection. The system keeps routing stable by ensuring that the same client IP is consistently mapped to the same backend node whenever the active node list remains unchanged.

The implementation extends a simple load-balancing problem into a more practical backend system with virtual nodes, weighted routing, health checks, metrics tracking, request validation, testing, and traffic simulation.

This project was built as part of a backend engineering evaluation focused on routing consistency and distributed-system fundamentals.

## Why This Implementation

Basic load balancers often rely on random selection or round-robin scheduling. While those approaches are simple, they do not preserve routing stability when traffic repeatedly comes from the same client.

This implementation uses consistent hashing, a technique commonly used in scalable backend infrastructure to minimize unnecessary traffic redistribution during scaling events.

Key capabilities:

- Deterministic IP-to-node routing
- Consistent hashing with a sorted hash ring
- Virtual nodes for smoother traffic distribution
- Weighted routing for capacity-aware balancing
- Health-aware routing that skips unhealthy nodes
- Dynamic node management APIs
- Request metrics and logging
- In-memory rate limiting
- CLI traffic simulation
- Automated tests using Node's built-in test runner
- Postman collection for API testing

## Original Logic Preserved

The original IP generation logic is preserved:

```js
function generateRandomIP() {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join(".");
}
```

The request identification flow is also retained:

```js
identifyNode(ip, selectedNode);
```

The routing strategy itself was redesigned. Instead of selecting a backend node randomly, incoming IP addresses are hashed and mapped onto a consistent hash ring.

## How Routing Works

Each backend node is placed multiple times on a circular hash ring. These repeated positions are called virtual nodes.

In this implementation:

- Every weight unit creates 100 virtual nodes
- Nodes with larger weights occupy more positions on the ring
- More ring positions generally result in a larger share of traffic

Request flow:

1. Validate the incoming IPv4 address
2. Hash the IP using SHA-256
3. Search the generated hash on the sorted ring
4. Route the request to the first matching node clockwise
5. Store routing details in logs and metrics

Because the same IP always produces the same hash, routing remains deterministic as long as the ring configuration stays unchanged.

## System Architecture

```text
Client Request
      |
      v
Express API Server
      |
      v
Rate Limiter
      |
      v
Load Balancer Controller
      |
      v
Consistent Hash Ring
      |
      v
Health Check Validation
      |
      v
Selected Backend Node
      |
      v
Logging + Metrics
      |
      v
API Response
```

## Tech Stack

- Node.js
- Express.js
- Native `crypto` module for hashing
- Node's built-in `node:test` runner
- In-memory storage for ring state and metrics
- Postman for API testing

## Getting Started

Install dependencies:

```bash
npm install
```

Start the server:

```bash
npm start
```

Server URL:

```text
http://localhost:5000
```

Development mode with auto-restart:

```bash
npm run dev
```

Run automated tests:

```bash
npm test
```

Run traffic simulation:

```bash
npm run simulate
```

## Default Nodes

The load balancer starts with three healthy backend nodes:

| Node | Weight | Healthy |
| --- | ---: | :---: |
| Node-A | 1 | Yes |
| Node-B | 1 | Yes |
| Node-C | 1 | Yes |

Weights determine how many virtual nodes are created for each backend node.

Example:

```text
Weight 1 -> 100 virtual nodes
Weight 3 -> 300 virtual nodes
```

A node with a larger weight is expected to receive a larger share of incoming traffic.

## API Reference

### Health Check

```http
GET /health
```

Returns API status and uptime information.

### Route a Request

```http
GET /route?ip=192.168.1.10
POST /route
```

Routes a client IP to a backend node.

If no IP is provided, the built-in random IP generator is used.

Example:

```bash
curl "http://localhost:5000/route?ip=192.168.1.10"
```

Example response:

```json
{
  "ip": "192.168.1.10",
  "selectedNode": "Node-B",
  "algorithm": "consistent-hashing"
}
```

### Simulate Traffic

```http
POST /simulate
```

Generates random IPs and routes them through the load balancer.

`requestCount` must be between 1 and 1000.

Example:

```bash
curl -X POST "http://localhost:5000/simulate" ^
  -H "Content-Type: application/json" ^
  -d "{\"requestCount\":10}"
```

### List Nodes

```http
GET /nodes
```

Returns all configured backend nodes and their current status.

Example:

```bash
curl "http://localhost:5000/nodes"
```

### Add a Node

```http
POST /nodes
```

Adds a new backend node and rebuilds the hash ring.

Example:

```bash
curl -X POST "http://localhost:5000/nodes" ^
  -H "Content-Type: application/json" ^
  -d "{\"id\":\"Node-D\",\"weight\":2}"
```

### Update Node Health

```http
PATCH /nodes/:id/health
```

Marks a node healthy or unhealthy.

Unhealthy nodes are skipped during routing without removing them from configuration.

Example:

```bash
curl -X PATCH "http://localhost:5000/nodes/Node-A/health" ^
  -H "Content-Type: application/json" ^
  -d "{\"healthy\":false}"
```

### Update Node Weight

```http
PATCH /nodes/:id/weight
```

Updates node weight and rebuilds the ring.

Example:

```bash
curl -X PATCH "http://localhost:5000/nodes/Node-B/weight" ^
  -H "Content-Type: application/json" ^
  -d "{\"weight\":3}"
```

### Remove a Node

```http
DELETE /nodes/:id
```

Removes a backend node and rebuilds the ring.

Example:

```bash
curl -X DELETE "http://localhost:5000/nodes/Node-C"
```

### Node Health Summary

```http
GET /nodes/health
```

Returns health information for all nodes.

Example:

```bash
curl "http://localhost:5000/nodes/health"
```

### Metrics

```http
GET /metrics
POST /metrics/reset
```

Returns metrics such as:

- Total routed requests
- Requests per node
- Failed requests
- Rate-limited requests
- Recent request activity
- Current ring size

Example:

```bash
curl "http://localhost:5000/metrics"
```

### Hash Ring Preview

```http
GET /ring?limit=10
```

Displays a portion of the sorted virtual-node ring for inspection and debugging.

Example:

```bash
curl "http://localhost:5000/ring?limit=10"
```

### Validate an IP

```http
POST /validate-ip
```

Example:

```bash
curl -X POST "http://localhost:5000/validate-ip" ^
  -H "Content-Type: application/json" ^
  -d "{\"ip\":\"192.168.1.10\"}"
```

## Example Review Flow

A simple way to demonstrate the project during evaluation:

1. Start the server using `npm start`
2. Call `GET /route?ip=192.168.1.10` multiple times
3. Verify that the same node is returned consistently
4. Add a new node using `POST /nodes`
5. Route the same IP again and observe limited redistribution
6. Mark a node unhealthy
7. Check `/metrics` and `/ring`
8. Run `npm test`

## Postman Collection

Import the following collection into Postman:

```text
postman/Load-Balancer.postman_collection.json
```

Default variable:

```text
http://localhost:5000
```

## Project Structure

```text
src/
  app.js                         Express app setup and middleware
  server.js                      API entry point
  simulate.js                    CLI traffic simulation
  loadBalancer.js                Routing facade and request flow

  config/
    defaultNodes.js              Initial node configuration

  controllers/
    loadBalancerController.js    API request handlers

  middleware/
    rateLimiter.js               In-memory rate limiter

  routes/
    loadBalancerRoutes.js        API routes

  services/
    ConsistentHashRing.js        Consistent hashing implementation
    MetricsStore.js              Metrics storage

  utils/
    AppError.js                  HTTP-friendly error helper

postman/
  Load-Balancer.postman_collection.json

test/
  consistentHashRing.test.js
  loadBalancer.test.js
```

## Design Decisions

**Consistent hashing over random selection**  
Maintains stable routing for repeated requests from the same client.

**Virtual nodes**  
Improves traffic distribution across backend nodes.

**Weighted routing**  
Allows stronger nodes to receive proportionally more traffic.

**Health-aware routing**  
Prevents unhealthy nodes from receiving requests.

**In-memory storage**  
Keeps the implementation lightweight and aligned with project constraints.

**Minimal API surface**  
Keeps the focus on routing, observability, and node management.

## Current Limitations

- All state is stored in memory and resets on restart
- There is no distributed coordination between multiple instances
- Rate limiting is intended for demonstration purposes only
- Concurrency handling is intentionally omitted to keep the implementation lightweight

## Available Scripts

| Command | Description |
| --- | --- |
| `npm start` | Start the API server |
| `npm run dev` | Start the server in development mode |
| `npm run simulate` | Run CLI traffic simulation |
| `npm test` | Execute automated tests |

## Summary

The implementation focuses on building a deterministic and fault-aware load-balancing system using consistent hashing.

Instead of relying on random routing, requests are mapped to backend nodes through a hash ring, allowing the same client IP to consistently reach the same server while minimizing redistribution during scaling events.

The project also includes weighted routing, virtual nodes, health-aware traffic management, metrics tracking, API-based node management, rate limiting, automated testing, and traffic simulation utilities.

The overall architecture keeps the system lightweight and easy to understand while still reflecting concepts used in real backend infrastructure and distributed systems.
