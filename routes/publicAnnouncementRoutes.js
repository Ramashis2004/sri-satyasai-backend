const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/announcementController");

router.get("/announcements", ctrl.publicList);

module.exports = router;
