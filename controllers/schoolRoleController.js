const Joi = require("joi");
const SchoolRole = require("../models/schoolRoleModel");

// Public: list all school roles
exports.getSchoolRoles = async (_req, res) => {
  try {
    const roles = await SchoolRole.find().sort({ name: 1 });
    res.json(roles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: create a new school role
exports.createSchoolRole = async (req, res) => {
  try {
    const schema = Joi.object({ name: Joi.string().trim().min(1).required() });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { name } = req.body;
    const exists = await SchoolRole.findOne({ name: new RegExp(`^${name}$`, 'i') }).lean();
    if (exists) return res.status(400).json({ message: "Role already exists" });

    const role = await SchoolRole.create({ name: name.trim() });
    res.status(201).json({ message: "Role created", role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: update a school role
exports.updateSchoolRole = async (req, res) => {
  try {
    const { id } = req.params;
    const schema = Joi.object({ name: Joi.string().trim().min(1).required() });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { name } = req.body;
    const exists = await SchoolRole.findOne({ _id: { $ne: id }, name: new RegExp(`^${name}$`, 'i') }).lean();
    if (exists) return res.status(400).json({ message: "Role already exists" });

    const role = await SchoolRole.findByIdAndUpdate(id, { name: name.trim() }, { new: true });
    if (!role) return res.status(404).json({ message: "Role not found" });
    res.json({ message: "Role updated", role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: delete a school role
exports.deleteSchoolRole = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await SchoolRole.findByIdAndDelete(id);
    if (!role) return res.status(404).json({ message: "Role not found" });
    res.json({ message: "Role deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
