const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const ctrl = require("../controllers/otherEventController");

// All routes require admin
router.use(auth, authorizeRoles("admin"));

router.get("/other-events", ctrl.list);
router.post("/other-events", ctrl.create);
router.patch("/other-events/:id", ctrl.update);
router.delete("/other-events/:id", ctrl.remove);

module.exports = router;
