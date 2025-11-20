const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const schoolScope = require("../middleware/schoolScopeMiddleware");
const ctrl = require("../controllers/schoolEventController");

// All routes require: auth -> role(school_user) -> schoolScope
router.use(auth, authorizeRoles("school_user"), schoolScope);

// Events
router.post("/events", ctrl.createEvent);
router.get("/events", ctrl.listEvents);
router.get("/events/:id", ctrl.getEvent);
router.patch("/events/:id", ctrl.updateEvent);
router.delete("/events/:id", ctrl.deleteEvent);

// Participants
router.post("/participants", ctrl.createParticipant);
router.get("/participants", ctrl.listParticipants);
router.post("/participants/assign-teacher", ctrl.assignTeacherToParticipant);
router.patch("/participants/:participantId", ctrl.updateParticipant);
router.delete("/participants/:participantId", ctrl.deleteParticipant);

// Accompanying Teachers
router.post("/teachers", ctrl.createTeacher);
router.get("/teachers", ctrl.listTeachers);
router.patch("/teachers/:teacherId", ctrl.updateTeacher);
router.delete("/teachers/delete/:teacherId", ctrl.deleteTeacher);

module.exports = router;
