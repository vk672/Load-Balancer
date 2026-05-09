const express = require("express");
const controller = require("../controllers/loadBalancerController");

const router = express.Router();

router.get("/route", controller.routeRequest);
router.post("/route", controller.routeRequest);
router.post("/simulate", controller.simulateRequests);
router.get("/nodes", controller.listNodes);
router.get("/nodes/health", controller.listNodeHealth);
router.post("/nodes", controller.addNode);
router.delete("/nodes/:id", controller.removeNode);
router.patch("/nodes/:id/health", controller.updateNodeHealth);
router.patch("/nodes/:id/weight", controller.updateNodeWeight);
router.get("/metrics", controller.getMetrics);
router.post("/metrics/reset", controller.resetMetrics);
router.get("/ring", controller.getRing);
router.post("/validate-ip", controller.validateIP);

module.exports = { router };
