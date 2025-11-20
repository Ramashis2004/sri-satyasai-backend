const Joi = require("joi");
const bcrypt = require("bcrypt");

const SchoolUser = require("../models/schoolUserModel");
const ITAdmin = require("../models/itAdminModel");
const EventCoordinator = require("../models/eventCoordinatorModel");
const DistrictCoordinator = require("../models/districtCoordinatorModel");
const Admin = require("../models/adminModel");
const School = require("../models/schoolModel");
const District = require("../models/districtModel");

const roleModelMap = {
  school_user: SchoolUser,
  it_admin: ITAdmin,
  event_coordinator: EventCoordinator,
  district_coordinator: DistrictCoordinator,
  admin: Admin,
};

const allModels = [SchoolUser, ITAdmin, EventCoordinator, DistrictCoordinator, Admin];

exports.approveUser = async (req, res) => {
  try {
    const { role, id } = req.params;
    const Model = roleModelMap[role];
    if (!Model) return res.status(400).json({ message: "Invalid role" });

    const schema = Joi.object({ approved: Joi.boolean().required() });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { approved } = req.body;
    const user = await Model.findByIdAndUpdate(id, { approved }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    const msg = approved ? "User approved successfully." : "User rejected successfully.";
    res.json({ message: msg, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { role, id } = req.params;
    const Model = roleModelMap[role];
    if (!Model) return res.status(400).json({ message: "Invalid role" });

    const deleted = await Model.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.listUsers = async (req, res) => {
  try {
    const { role } = req.params;
    const Model = roleModelMap[role];

    if (!Model) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // If role is admin, don't show any data
    if (role === "admin") {
      return res.status(200).json([]); // return empty list
    }

    const users = await Model.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.resetPassword = async (req, res) => {
  try {
    const { role, id } = req.params;
    const Model = roleModelMap[role];
    if (!Model) return res.status(400).json({ message: "Invalid role" });

    const schema = Joi.object({ newPassword: Joi.string().min(6).required() });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { newPassword } = req.body;
    const hashed = await bcrypt.hash(newPassword, 10);
    const user = await Model.findByIdAndUpdate(id, { password: hashed }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Password reset successfully", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { role, id } = req.params;
    const Model = roleModelMap[role];
    if (!Model) return res.status(400).json({ message: "Invalid role" });

    const schema = Joi.object({
      name: Joi.string().allow(""),
      email: Joi.string().email().allow(""),
      mobile: Joi.string().allow(""),
      newPassword: Joi.string().min(6).allow(""),
      districtId: Joi.string().allow(""),
      schoolName: Joi.string().allow(""),
      roleInSchool: Joi.string().allow(""),
      approved: Joi.boolean().optional(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const updates = { ...req.body };

    // Load current user for validations that require existing values
    const currentUser = await Model.findById(id).lean();
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    // If email is being updated, ensure uniqueness within the same role collection only
    if (updates.email) {
      const existsEmail = await Model.findOne({ email: updates.email, _id: { $ne: id } }).lean().select("_id");
      if (existsEmail) return res.status(400).json({ message: "Email already in use" });
    }
    // If mobile is being updated, ensure uniqueness within the same role collection only
    if (updates.mobile) {
      const existsMobile = await Model.findOne({ mobile: updates.mobile, _id: { $ne: id } }).lean().select("_id");
      if (existsMobile) return res.status(400).json({ message: "Mobile already in use" });
    }

    // Handle password update
    if (updates.newPassword) {
      const hashed = await bcrypt.hash(updates.newPassword, 10);
      updates.password = hashed;
      delete updates.newPassword;
    }

    // For school_user: prevent duplicate combination of districtId + schoolName + roleInSchool
    if (role === "school_user") {
      const effDistrictId = typeof updates.districtId !== 'undefined' && updates.districtId !== null && updates.districtId !== ''
        ? updates.districtId
        : (currentUser.districtId ? currentUser.districtId.toString() : undefined);
      const effSchoolName = typeof updates.schoolName !== 'undefined' && updates.schoolName !== null
        ? updates.schoolName
        : currentUser.schoolName;
      const effRoleInSchool = typeof updates.roleInSchool !== 'undefined' && updates.roleInSchool !== null
        ? updates.roleInSchool
        : currentUser.roleInSchool;

      if (effDistrictId && effSchoolName && effRoleInSchool) {
        const duplicateRoleUser = await SchoolUser.findOne({
          _id: { $ne: id },
          districtId: effDistrictId,
          schoolName: effSchoolName,
          roleInSchool: effRoleInSchool,
        }).lean();
        if (duplicateRoleUser) {
          return res.status(400).json({ message: "A user with the same District, School and Role already exists." });
        }
      }
    }

    const user = await Model.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    const safe = user.toObject ? user.toObject() : user;
    delete safe.password;
    res.json({ message: "User updated successfully", user: safe });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.renameSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const schema = Joi.object({ schoolName: Joi.string().required() });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });
    const { schoolName } = req.body;
    const doc = await School.findByIdAndUpdate(id, { schoolName }, { new: true });
    if (!doc) return res.status(404).json({ message: "School not found" });
    res.json({ message: "School renamed successfully", school: doc });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.renameDistrict = async (req, res) => {
  try {
    const { id } = req.params;
    const schema = Joi.object({ districtName: Joi.string().required() });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });
    const { districtName } = req.body;
    const doc = await District.findByIdAndUpdate(id, { districtName }, { new: true });
    if (!doc) return res.status(404).json({ message: "District not found" });
    res.json({ message: "District renamed successfully", district: doc });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

