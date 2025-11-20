const District = require("../models/districtModel");
const School = require("../models/schoolModel");
const Joi = require("joi");

// ✅ Get all schools under a district
exports.getSchoolsByDistrict = async (req, res) => {
  try {
    const { districtName } = req.params;

    const district = await District.findOne({ districtName });
    if (!district) return res.status(404).json({ message: "District not found" });

    const schools = await School.find({ districtId: district._id });

    if (!schools || schools.length === 0) {
      return res.status(404).json({ message: "No schools found for this district." });
    }

    res.json(schools);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Rename a district (Admin only)
exports.renameDistrict = async (req, res) => {
  try {
    const { id } = req.params;
    const schema = Joi.object({ districtName: Joi.string().required() });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });
    const { districtName } = req.body;

    const doc = await District.findByIdAndUpdate(id, { districtName }, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ message: "District not found" });
    res.json({ message: "District renamed successfully", district: doc });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(400).json({ message: "District already exists" });
    }
    res.status(500).json({ message: err.message });
  }
};

// ✅ Delete a district (Admin only)
exports.deleteDistrict = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await District.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ message: "District not found" });
    res.json({ message: "District deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Update a school (Admin only)
exports.updateSchool = async (req, res) => {
  try {
    const schema = Joi.object({
      schoolName: Joi.string().allow(""),
      districtId: Joi.string().allow(""),
      districtName: Joi.string().allow(""),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { id } = req.params;
    let { schoolName, districtId, districtName } = req.body;

    const update = {};
    if (schoolName) update.schoolName = schoolName;
    if (!districtId && districtName) {
      const dist = await District.findOne({ districtName });
      if (!dist) return res.status(404).json({ message: "District not found" });
      districtId = dist._id.toString();
    }
    if (districtId) update.districtId = districtId;

    const school = await School.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!school) return res.status(404).json({ message: "School not found" });
    res.json({ message: "School updated", school });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(400).json({ message: "School already exists in this district" });
    }
    res.status(500).json({ message: err.message });
  }
};

// ✅ Delete a school (Admin only)
exports.deleteSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const school = await School.findByIdAndDelete(id);
    if (!school) return res.status(404).json({ message: "School not found" });
    res.json({ message: "School deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllDistricts = async (req, res) => {
  try {
    const districts = await District.find().sort({ districtName: 1 });
    res.json(districts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllSchools = async (req, res) => {
  try {
    const { districtId, districtName } = req.query;
    const query = {};
    if (districtId) {
      query.districtId = districtId;
    } else if (districtName) {
      const dist = await District.findOne({ districtName });
      if (!dist) return res.json([]);
      query.districtId = dist._id;
    }
    const schools = await School.find(query).sort({ schoolName: 1 });
    res.json(schools);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createDistrict = async (req, res) => {
  try {
    const schema = Joi.object({ districtName: Joi.string().required() });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { districtName } = req.body;
    const exists = await District.findOne({ districtName });
    if (exists) return res.status(400).json({ message: "District already exists" });

    const district = await District.create({ districtName });
    res.status(201).json({ message: "District created", district });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createSchool = async (req, res) => {
  try {
    const schema = Joi.object({
      schoolName: Joi.string().required(),
      districtId: Joi.string().allow(""),
      districtName: Joi.string().allow(""),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    let { schoolName, districtId, districtName } = req.body;

    if (!districtId) {
      if (!districtName) return res.status(400).json({ message: "districtId or districtName is required" });
      const dist = await District.findOne({ districtName });
      if (!dist) return res.status(404).json({ message: "District not found" });
      districtId = dist._id.toString();
    }

    const school = await School.create({ schoolName, districtId });
    res.status(201).json({ message: "School created", school });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(400).json({ message: "School already exists in this district" });
    }
    res.status(500).json({ message: err.message });
  }
};

// ✅ Approve a school (District Coordinator only)
exports.approveSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;

    const school = await School.findByIdAndUpdate(
      id,
      { approved },
      { new: true }
    );

    if (!school) return res.status(404).json({ message: "School not found" });

    const msg = approved
      ? "School approved successfully."
      : "School rejected successfully.";

    res.json({ message: msg, school });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
