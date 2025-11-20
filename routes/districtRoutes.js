const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { getSchoolsByDistrict, approveSchool, createDistrict, createSchool, getAllDistricts, getAllSchools, updateSchool, deleteSchool, renameDistrict, deleteDistrict } = require("../controllers/districtController");
const { getSchoolRoles } = require("../controllers/schoolRoleController");

// Public: list schools for a given district name
router.get("/schools/:districtName", getSchoolsByDistrict);

// Public: list all districts
router.get("/districts", getAllDistricts);

// Public: list all schools (optional ?districtId= or ?districtName=)
router.get("/schools", getAllSchools);

// Public: list school roles
router.get("/school-roles", getSchoolRoles);

// Approve/reject a school (District Coordinator or Admin)
router.patch("/schools/:id/approve", auth, authorizeRoles("district_coordinator", "admin"), approveSchool);

// Create a district (Admin only)
router.post("/districts", auth, authorizeRoles("admin"), createDistrict);

// Rename a district (Admin only)
router.patch("/districts/:id", auth, authorizeRoles("admin"), renameDistrict);

// Delete a district (Admin only)
router.delete("/districts/:id", auth, authorizeRoles("admin"), deleteDistrict);

// Create a school (Admin only)
router.post("/schools", auth, authorizeRoles("admin"), createSchool);

// Update a school (Admin only)
router.patch("/schools/:id", auth, authorizeRoles("admin"), updateSchool);

// Delete a school (Admin only)
router.delete("/schools/:id", auth, authorizeRoles("admin"), deleteSchool);

module.exports = router;


