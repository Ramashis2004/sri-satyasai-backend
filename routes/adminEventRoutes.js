const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const ctrl = require("../controllers/adminEventController");

// All routes require admin
router.use(auth, authorizeRoles("admin"));

router.get("/events", ctrl.list);
router.post("/events", ctrl.create);
router.patch("/events/:id", ctrl.update);
router.delete("/events/:id", ctrl.remove);

module.exports = router;
