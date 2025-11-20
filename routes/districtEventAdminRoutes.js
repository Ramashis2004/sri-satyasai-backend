const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const ctrl = require("../controllers/districtEventController");

// All routes require admin
router.use(auth, authorizeRoles("admin"));

router.get("/district-events", ctrl.list);
router.post("/district-events", ctrl.create);
router.patch("/district-events/:id", ctrl.update);
router.delete("/district-events/:id", ctrl.remove);

module.exports = router;
