const SchoolUser = require("../models/schoolUserModel");

// Attaches req.schoolScope = { districtId, schoolName } for logged-in school_user
module.exports = async function schoolScope(req, res, next) {
  try {
    if (!req.user || req.user.role !== "school_user") {
      return res.status(403).json({ message: "Access denied." });
    }
    const user = await SchoolUser.findById(req.user.id).lean().select("districtId schoolName approved");
    if (!user) return res.status(401).json({ message: "User not found" });
    if (typeof user.approved !== "undefined" && !user.approved) return res.status(403).json({ message: "Account not approved yet." });
    if (!user.districtId || !user.schoolName) return res.status(400).json({ message: "School details incomplete for this user." });

    req.schoolScope = { districtId: user.districtId.toString(), schoolName: user.schoolName };
    next();
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}
