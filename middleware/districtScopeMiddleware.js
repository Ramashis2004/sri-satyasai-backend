const DistrictCoordinator = require("../models/districtCoordinatorModel");

// Attaches req.districtScope = { districtId } for logged-in district_coordinator
module.exports = async function districtScope(req, res, next) {
  try {
    if (!req.user || req.user.role !== "district_coordinator") {
      return res.status(403).json({ message: "Access denied." });
    }
    const user = await DistrictCoordinator.findById(req.user.id).lean().select("districtId approved");
    if (!user) return res.status(401).json({ message: "User not found" });
    if (typeof user.approved !== "undefined" && !user.approved) return res.status(403).json({ message: "Account not approved yet." });
    if (!user.districtId) return res.status(400).json({ message: "District not linked to this user." });

    req.districtScope = { districtId: user.districtId.toString() };
    next();
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
