const express = require("express");
const router = express.Router();

// Controllers reused from admin/district controllers but without auth middleware
const adminEventCtrl = require("../controllers/adminEventController");
const districtEventCtrl = require("../controllers/districtEventController");

// Public, read-only endpoints
router.get("/events", adminEventCtrl.list);
router.get("/district-events", districtEventCtrl.list);

module.exports = router;
