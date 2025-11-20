const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const ctrl = require("../controllers/evaluationFormatController");

// Admin-only evaluation format routes
router.use(auth, authorizeRoles("admin"));

// Query: scope=school|district, eventId=<id>
router.get("/evaluation-form", ctrl.get);
router.post("/evaluation-form", ctrl.upsert);

module.exports = router;
