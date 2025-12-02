const Joi = require("joi");
const mongoose = require("mongoose");
const { auth } = require("../middleware/authMiddleware");
const Event = require("../models/eventModel");
const Participant = require("../models/participantModel");
const DistrictEvent = require("../models/districtEventModel");
const DistrictParticipant = require("../models/districtParticipantModel");
const District = require("../models/districtModel");

// Helper to get distinct event docs from Participant collection (school scope)
async function eventsFromSchoolParticipants() {
  const rows = await Participant.aggregate([
    { $match: { } },
    { $group: { _id: "$eventId", count: { $sum: 1 } } },
    { $match: { _id: { $ne: null } } },
  ]);
  const ids = rows.map((r) => r._id).filter(Boolean);
  if (!ids.length) return [];
  const events = await Event.find({ _id: { $in: ids } }).lean().select("_id title");
  // Preserve any order by title
  return events.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
}

// Helper to get distinct event docs from DistrictParticipant collection (district scope)
async function eventsFromDistrictParticipants() {
  const rows = await DistrictParticipant.aggregate([
    { $match: { } },
    { $group: { _id: "$eventId", count: { $sum: 1 } } },
    { $match: { _id: { $ne: null } } },
  ]);
  const ids = rows.map((r) => r._id).filter(Boolean);
  if (!ids.length) return [];
  const events = await DistrictEvent.find({ _id: { $in: ids } }).lean().select("_id title");
  return events.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
}

exports.listSchoolEvents = async (req, res) => {
  try {
    const items = await eventsFromSchoolParticipants();
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.listDistrictEvents = async (req, res) => {
  try {
    const items = await eventsFromDistrictParticipants();
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.listParticipants = async (req, res) => {
  try {
    const schema = Joi.object({ scope: Joi.string().valid("school", "district").required(), eventId: Joi.string().required() });
    const { error } = schema.validate(req.query);
    if (error) return res.status(400).json({ message: error.details[0].message });
    const { scope, eventId } = req.query;

    const isSchool = scope === "school";
    const items = isSchool
      ? await Participant.find({ eventId })
          .lean()
          .select("_id name className gender eventId marks evaluation schoolName districtId present group")
      : await DistrictParticipant.find({ eventId })
          .lean()
          .select("_id name className gender eventId marks evaluation districtId present");

    const districtIds = Array.from(new Set(items.map((it) => String(it.districtId || "")).filter(Boolean)));
    let districtNameMap = new Map();
    if (districtIds.length) {
      const districts = await District.find({ _id: { $in: districtIds } })
        .lean()
        .select("_id districtName");
      districtNameMap = new Map(districts.map((d) => [String(d._id), d.districtName]));
    }

    const withNames = items.map((it) => ({
      ...it,
      districtName: districtNameMap.get(String(it.districtId)) || "",
    }));

    return res.json(withNames);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.submitMarks = async (req, res) => {
  try {
    const schema = Joi.object({
      scope: Joi.string().valid("school", "district").required(),
      eventId: Joi.string().required(),
      items: Joi.array().items(
        Joi.object({
          participantId: Joi.string().required(),
          marks: Joi.number().min(0).max(30).required(),
          evaluation: Joi.string().allow(""),
        })
      ).min(1).required(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });
    const { scope, items } = req.body;

    let updated = 0;
    if (scope === "school") {
      for (const it of items) {
        const p = await Participant.findById(it.participantId);
        if (!p) continue;
        p.marks = it.marks;
        p.evaluation = it.evaluation || "";
        p.evaluatedBy = req.user && req.user.id ? req.user.id : undefined;
        p.evaluatedAt = new Date();
        await p.save();
        updated += 1;
      }
    } else {
      for (const it of items) {
        const p = await DistrictParticipant.findById(it.participantId);
        if (!p) continue;
        p.marks = it.marks;
        p.evaluation = it.evaluation || "";
        p.evaluatedBy = req.user && req.user.id ? req.user.id : undefined;
        p.evaluatedAt = new Date();
        await p.save();
        updated += 1;
      }
    }

    res.json({ message: "Saved", updatedCount: updated });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
