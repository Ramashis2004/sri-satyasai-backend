const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const ctrl = require("../controllers/announcementController");

// Admin-only CRUD for announcements
router.use(auth, authorizeRoles("admin"));

router.get("/announcements", ctrl.list);
router.post("/announcements", ctrl.create);
router.patch("/announcements/:id", ctrl.update);
router.delete("/announcements/:id", ctrl.remove);

module.exports = router;
