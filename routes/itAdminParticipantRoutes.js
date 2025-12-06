const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const ctrl = require("../controllers/itAdminParticipantController");
const tctrl = require("../controllers/itAdminTeacherController");
const adminEventCtrl = require("../controllers/adminEventController");
const distEventCtrl = require("../controllers/districtEventController");
const overviewCtrl = require("../controllers/itAdminOverviewController");

router.use(auth, authorizeRoles("it_admin"));

router.get("/participants", ctrl.listParticipants);
router.post("/participants", ctrl.createParticipant);
router.patch("/participants/:id", ctrl.updateParticipant);
router.delete("/participants/:id", ctrl.deleteParticipant);
router.post("/participants/finalize", ctrl.finalizeParticipants);

router.get("/teachers", tctrl.listTeachers);
router.post("/teachers", tctrl.createTeacher);
router.patch("/teachers/:id", tctrl.updateTeacher);
router.delete("/teachers/:id", tctrl.deleteTeacher);
router.post("/teachers/finalize", tctrl.finalizeTeachers);

// Read-only event listings for IT Admin filters
router.get("/events", adminEventCtrl.list);
router.get("/district-events", distEventCtrl.list);

// Overview endpoints (metrics and reports)
router.get("/overview/metrics", overviewCtrl.getMetrics);
router.get("/overview/not-reported", overviewCtrl.getNotReported);
router.get("/overview/students-yet-to-report", overviewCtrl.getStudentsYetToReport);
router.get("/overview/teachers", overviewCtrl.getTeachersOverview);

// Summary report endpoints
router.get("/reports/participants-by-district", overviewCtrl.getParticipantsByDistrictReport);
router.get("/reports/teachers-by-district", overviewCtrl.getTeachersByDistrictReport);
router.get("/reports/teachers-by-school", overviewCtrl.getTeachersBySchoolReport);

module.exports = router;
