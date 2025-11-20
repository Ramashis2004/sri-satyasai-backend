const Joi = require("joi");
const DistrictEvent = require("../models/districtEventModel");
const DistrictParticipant = require("../models/districtParticipantModel");
const DistrictTeacher = require("../models/districtAccompanyingTeacherModel");

exports.listEvents = async (req, res) => {
  try {
    const items = await DistrictEvent.find().sort({ date: -1, createdAt: -1 });
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// Participants
exports.createParticipant = async (req, res) => {
  try {
    const schema = Joi.object({
      eventId: Joi.string().required(),
      name: Joi.string().required(),
      className: Joi.string().allow(""),
      gender: Joi.string().allow(""),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const ev = await DistrictEvent.findById(req.body.eventId);
    if (!ev) return res.status(404).json({ message: "Event not found" });

    const doc = await DistrictParticipant.create({
      name: req.body.name,
      className: req.body.className,
      gender: req.body.gender,
      eventId: ev._id,
      districtId: req.districtScope.districtId,
      createdBy: req.user.id,
    });
    res.status(201).json({ message: "Participant added", participant: doc });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.listParticipants = async (req, res) => {
  try {
    const { eventId } = req.query;
    const filter = { districtId: req.districtScope.districtId };
    if (eventId) filter.eventId = eventId;
    const items = await DistrictParticipant.find(filter).sort({ createdAt: -1 });
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.updateParticipant = async (req, res) => {
  try {
    const { participantId } = req.params;
    const schema = Joi.object({ name: Joi.string().allow(""), className: Joi.string().allow(""), gender: Joi.string().allow("") });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const p = await DistrictParticipant.findById(participantId);
    if (!p || p.districtId.toString() !== req.districtScope.districtId) return res.status(404).json({ message: "Participant not found" });
    if (req.body.name != null) p.name = req.body.name;
    if (req.body.className != null) p.className = req.body.className;
    if (req.body.gender != null) p.gender = req.body.gender;
    await p.save();
    res.json({ message: "Participant updated", participant: p });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.deleteParticipant = async (req, res) => {
  try {
    const { participantId } = req.params;
    const p = await DistrictParticipant.findById(participantId);
    if (!p || p.districtId.toString() !== req.districtScope.districtId) return res.status(404).json({ message: "Participant not found" });
    await p.deleteOne();
    res.json({ message: "Participant deleted" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// Teachers (Accompanying Guru)
exports.createTeacher = async (req, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().required(),
      email: Joi.string().email().allow(""),
      mobile: Joi.string().allow(""),
      member: Joi.string().allow(""),
      gender: Joi.string().allow(""),
      eventId: Joi.string().allow(""),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    let eventId;
    if (req.body.eventId) {
      const ev = await DistrictEvent.findById(req.body.eventId);
      if (!ev) return res.status(404).json({ message: "Event not found" });
      eventId = ev._id;
    }

    const doc = await DistrictTeacher.create({
      name: req.body.name,
      email: req.body.email,
      mobile: req.body.mobile,
      member: req.body.member,
      gender: req.body.gender,
      eventId,
      districtId: req.districtScope.districtId,
      createdBy: req.user.id,
    });
    res.status(201).json({ message: "Teacher created", teacher: doc });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.listTeachers = async (req, res) => {
  try {
    const items = await DistrictTeacher.find({ districtId: req.districtScope.districtId }).sort({ name: 1 });
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const schema = Joi.object({ name: Joi.string().allow(""), email: Joi.string().email().allow(""), mobile: Joi.string().allow(""), member: Joi.string().allow(""), gender: Joi.string().allow(""), eventId: Joi.string().allow("") });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const t = await DistrictTeacher.findById(teacherId);
    if (!t || t.districtId.toString() !== req.districtScope.districtId) return res.status(404).json({ message: "Teacher not found" });

    if (req.body.name != null) t.name = req.body.name;
    if (req.body.email != null) t.email = req.body.email;
    if (req.body.mobile != null) t.mobile = req.body.mobile;
    if (req.body.member != null) t.member = req.body.member;
    if (req.body.gender != null) t.gender = req.body.gender;
    if (req.body.eventId != null) {
      if (!req.body.eventId) t.eventId = undefined;
      else {
        const ev = await DistrictEvent.findById(req.body.eventId);
        if (!ev) return res.status(404).json({ message: "Event not found" });
        t.eventId = ev._id;
      }
    }

    await t.save();
    res.json({ message: "Teacher updated", teacher: t });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.deleteTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const t = await DistrictTeacher.findById(teacherId);
    if (!t || t.districtId.toString() !== req.districtScope.districtId) return res.status(404).json({ message: "Teacher not found" });
    await t.deleteOne();
    res.json({ message: "Teacher deleted" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
