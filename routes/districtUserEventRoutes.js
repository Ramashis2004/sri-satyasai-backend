const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const districtScope = require("../middleware/districtScopeMiddleware");
const ctrl = require("../controllers/districtUserEventController");

router.use(auth, authorizeRoles("district_coordinator"), districtScope);

router.get("/events", ctrl.listEvents);

router.post("/participants", ctrl.createParticipant);
router.get("/participants", ctrl.listParticipants);
router.patch("/participants/:participantId", ctrl.updateParticipant);
router.delete("/participants/:participantId", ctrl.deleteParticipant);

router.post("/teachers", ctrl.createTeacher);
router.get("/teachers", ctrl.listTeachers);
router.patch("/teachers/:teacherId", ctrl.updateTeacher);
router.delete("/teachers/delete/:teacherId", ctrl.deleteTeacher);

module.exports = router;
