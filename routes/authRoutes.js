const express = require("express");
const router = express.Router();
const adminAuth = require("../controllers/adminAuthController");
const schoolUserAuth = require("../controllers/schoolUserAuthController");
const itAdminAuth = require("../controllers/itAdminAuthController");
const eventCoordinatorAuth = require("../controllers/eventCoordinatorAuthController");
const districtCoordinatorAuth = require("../controllers/districtCoordinatorAuthController");

// Role dispatcher for backward-compatible dynamic endpoints
const roleHandlers = {
  admin: adminAuth,
  school_user: schoolUserAuth,
  it_admin: itAdminAuth,
  event_coordinator: eventCoordinatorAuth,
  district_coordinator: districtCoordinatorAuth,
};

// Back-compat dynamic endpoints (do not break existing frontend)
router.post("/:role/register", (req, res) => {
  const h = roleHandlers[req.params.role];
  if (!h || !h.register) return res.status(400).json({ message: "Invalid role" });
  return h.register(req, res);
});
router.post("/:role/login", (req, res) => {
  const h = roleHandlers[req.params.role];
  if (!h || !h.login) return res.status(400).json({ message: "Invalid role" });
  return h.login(req, res);
});
router.post("/:role/forgot-password", (req, res) => {
  const h = roleHandlers[req.params.role];
  if (!h || !h.forgotPassword) return res.status(400).json({ message: "Invalid role" });
  return h.forgotPassword(req, res);
});
router.post("/:role/reset-password", (req, res) => {
  const h = roleHandlers[req.params.role];
  if (!h || !h.resetPasswordWithToken) return res.status(400).json({ message: "Invalid role" });
  return h.resetPasswordWithToken(req, res);
});

// Explicit per-role endpoints under /auth prefix
router.post("/auth/admin/register", adminAuth.register);
router.post("/auth/admin/login", adminAuth.login);
router.post("/auth/admin/forgot-password", adminAuth.forgotPassword);
router.post("/auth/admin/reset-password", adminAuth.resetPasswordWithToken);

router.post("/auth/school_user/register", schoolUserAuth.register);
router.post("/auth/school_user/login", schoolUserAuth.login);
router.post("/auth/school_user/forgot-password", schoolUserAuth.forgotPassword);
router.post("/auth/school_user/reset-password", schoolUserAuth.resetPasswordWithToken);

router.post("/auth/it_admin/register", itAdminAuth.register);
router.post("/auth/it_admin/login", itAdminAuth.login);
router.post("/auth/it_admin/forgot-password", itAdminAuth.forgotPassword);
router.post("/auth/it_admin/reset-password", itAdminAuth.resetPasswordWithToken);

router.post("/auth/event_coordinator/register", eventCoordinatorAuth.register);
router.post("/auth/event_coordinator/login", eventCoordinatorAuth.login);
router.post("/auth/event_coordinator/forgot-password", eventCoordinatorAuth.forgotPassword);
router.post("/auth/event_coordinator/reset-password", eventCoordinatorAuth.resetPasswordWithToken);

router.post("/auth/district_coordinator/register", districtCoordinatorAuth.register);
router.post("/auth/district_coordinator/login", districtCoordinatorAuth.login);
router.post("/auth/district_coordinator/forgot-password", districtCoordinatorAuth.forgotPassword);
router.post("/auth/district_coordinator/reset-password", districtCoordinatorAuth.resetPasswordWithToken);

module.exports = router;
