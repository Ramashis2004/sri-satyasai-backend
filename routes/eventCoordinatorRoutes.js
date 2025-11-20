const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const ctrl = require("../controllers/eventCoordinatorController");
const evalCtrl = require("../controllers/evaluationFormatController");

// All routes require event_coordinator
router.use(auth, authorizeRoles("event_coordinator"));

// Events
router.get("/events/school", ctrl.listSchoolEvents);
router.get("/events/district", ctrl.listDistrictEvents);

// Participants for selected event
router.get("/participants", ctrl.listParticipants);

// Read-only evaluation format for a given event
router.get("/evaluation-form", evalCtrl.get);

// Submit marks
router.post("/marks", ctrl.submitMarks);

module.exports = router;
