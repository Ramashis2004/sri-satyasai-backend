const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { approveUser, listUsers, resetPassword, updateUser, deleteUser } = require("../controllers/adminController");
const adminEventRoutes = require("./adminEventRoutes");
const { createSchoolRole, updateSchoolRole, deleteSchoolRole } = require("../controllers/schoolRoleController");

// List users by role
router.get("/:role", auth, authorizeRoles("admin"), listUsers);

// Approve / reject user by role and id
router.patch("/:role/:id/approve", auth, authorizeRoles("admin"), approveUser);

// Admin: reset any user's password by role and id
router.patch("/:role/:id/reset-password", auth, authorizeRoles("admin"), resetPassword);

// Admin: update user details by role and id
router.patch("/:role/:id", auth, authorizeRoles("admin"), updateUser);

// Admin: delete user by role and id
router.delete("/:role/:id", auth, authorizeRoles("admin"), deleteUser);

// Admin: school roles CRUD
router.post("/school-roles", auth, authorizeRoles("admin"), createSchoolRole);
router.patch("/school-roles/update/:id", auth, authorizeRoles("admin"), updateSchoolRole);
router.delete("/school-roles/delete/:id", auth, authorizeRoles("admin"), deleteSchoolRole);

module.exports = router;
