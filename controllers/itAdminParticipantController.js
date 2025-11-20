const Joi = require("joi");
const Participant = require("../models/participantModel");
const DistrictParticipant = require("../models/districtParticipantModel");
const Event = require("../models/eventModel");
const DistrictEvent = require("../models/districtEventModel");

function buildFilters(query) {
  const { eventId, districtId, schoolName, q, present, frozen, gender } = query || {};
  const base = {};
  if (eventId) base.eventId = eventId;
  if (districtId) base.districtId = districtId;
  if (typeof schoolName !== "undefined" && schoolName !== "") base.schoolName = schoolName;
  if (typeof present !== "undefined" && present !== "") base.present = String(present) === "true";
  if (typeof frozen !== "undefined" && frozen !== "") base.frozen = String(frozen) === "true";
  if (typeof gender !== "undefined" && gender !== "") base.gender = gender;
  return { base, q: (q || "").trim().toLowerCase() };
}

exports.listParticipants = async (req, res) => {
  try {
    const { scope = "all" } = req.query;
    const { base, q } = buildFilters(req.query);
    // Build present filter so that missing present counts as absent
    let presentFilter = undefined;
    if (typeof req.query.present !== 'undefined' && req.query.present !== '') {
      if (String(req.query.present) === 'true') presentFilter = { present: true };
      else presentFilter = { $or: [ { present: false }, { present: { $exists: false } } ] };
    }

    const matchText = (p) => {
      if (!q) return true;
      return (
        String(p.name || "").toLowerCase().includes(q) ||
        String(p.className || "").toLowerCase().includes(q)
      );
    };

    // Fetch raw items first
    const results = [];
    let schoolItems = [];
    let districtItems = [];
    if (scope === "all" || scope === "school") {
      const schoolBase = { ...base };
      if (typeof req.query.group !== 'undefined' && req.query.group !== '') {
        schoolBase.group = req.query.group;
      }
      const schoolQuery = presentFilter ? { $and: [ schoolBase, presentFilter ] } : schoolBase;
      schoolItems = await Participant.find(schoolQuery).lean();
      schoolItems.forEach((p) => { if (matchText(p)) results.push({ ...p, source: "school" }); });
    }
    if (scope === "all" || scope === "district") {
      const b = { ...base };
      delete b.schoolName;
      const distBase = b;
      const distQuery = presentFilter ? { $and: [ distBase, presentFilter ] } : distBase;
      districtItems = await DistrictParticipant.find(distQuery).lean();
      districtItems.forEach((p) => { if (matchText(p)) results.push({ ...p, source: "district" }); });
    }

    // Build maps for event titles and district names
    const uniq = (arr) => Array.from(new Set(arr.map(String))).filter(Boolean);
    const schoolEventIds = uniq(results.filter(r => r.source === 'school').map(r => r.eventId));
    const districtEventIds = uniq(results.filter(r => r.source === 'district').map(r => r.eventId));
    const districtIds = uniq(results.map(r => r.districtId));

    const Event = require("../models/eventModel");
    const DistrictEvent = require("../models/districtEventModel");
    const District = require("../models/districtModel");

    const [schoolEvents, distEvents, districts] = await Promise.all([
      schoolEventIds.length ? Event.find({ _id: { $in: schoolEventIds } }).lean().select("_id title") : [],
      districtEventIds.length ? DistrictEvent.find({ _id: { $in: districtEventIds } }).lean().select("_id title") : [],
      districtIds.length ? District.find({ _id: { $in: districtIds } }).lean().select("_id districtName") : [],
    ]);

    const evMap = new Map(schoolEvents.map(e => [String(e._id), e.title]));
    const devMap = new Map(distEvents.map(e => [String(e._id), e.title]));
    const dMap = new Map(districts.map(d => [String(d._id), d.districtName]));

    const withNames = results.map(r => ({
      ...r,
      eventTitle: r.source === 'school' ? (evMap.get(String(r.eventId)) || '') : (devMap.get(String(r.eventId)) || ''),
      districtName: dMap.get(String(r.districtId)) || '',
    }));

    res.json(withNames);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.createParticipant = async (req, res) => {
  try {
    const schema = Joi.object({
      source: Joi.string().valid("school", "district").required(),
      eventId: Joi.string().required(),
      name: Joi.string().required(),
      className: Joi.string().allow(""),
      gender: Joi.string().allow(""),
      group: Joi.string().allow(""), // for school
      districtId: Joi.string().allow(""),
      schoolName: Joi.string().allow(""),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { source, eventId, name, className, gender, group, districtId, schoolName } = req.body;

    if (source === "school") {
      if (!districtId || !schoolName)
        return res.status(400).json({ message: "districtId and schoolName are required for school participants" });
      const ev = await Event.findById(eventId);
      if (!ev) return res.status(404).json({ message: "Event not found" });

      const participant = await Participant.create({
        name,
        className,
        gender,
        group,
        eventId: ev._id,
        districtId,
        schoolName,
        createdBy: req.user.id,
      });
      return res.status(201).json({ message: "Participant added", participant });
    } else {
      if (!districtId)
        return res.status(400).json({ message: "districtId is required for district participants" });
      const dev = await DistrictEvent.findById(eventId);
      if (!dev) return res.status(404).json({ message: "Event not found" });

      const participant = await DistrictParticipant.create({
        name,
        className,
        gender,
        eventId: dev._id,
        districtId,
        createdBy: req.user.id,
      });
      return res.status(201).json({ message: "Participant added", participant });
    }
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.updateParticipant = async (req, res) => {
  try {
    const schema = Joi.object({
      source: Joi.string().valid("school", "district").required(),
      updates: Joi.object({
        name: Joi.string().allow(""),
        className: Joi.string().allow(""),
        gender: Joi.string().allow(""),
        eventId: Joi.string().allow(""),
        present: Joi.boolean(),
        frozen: Joi.boolean(),
      }).required(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { id } = req.params;
    const { source, updates } = req.body;

    const Model = source === "school" ? Participant : DistrictParticipant;
    const doc = await Model.findById(id);
    if (!doc) return res.status(404).json({ message: "Participant not found" });

    if (doc.frozen) {
      const updatesKeys = Object.keys(updates || {});
      const onlyToggleFrozen = updatesKeys.length === 1 && typeof updates.frozen !== 'undefined';
      if (!onlyToggleFrozen) return res.status(400).json({ message: "Cannot update a frozen participant" });
    }

    if (typeof updates.name !== "undefined") doc.name = updates.name;
    if (typeof updates.className !== "undefined") doc.className = updates.className;
    if (typeof updates.gender !== "undefined") doc.gender = updates.gender;
    if (typeof updates.present !== "undefined") doc.present = updates.present;
    if (typeof updates.eventId !== "undefined" && updates.eventId) doc.eventId = updates.eventId;
    if (typeof updates.frozen !== "undefined") doc.frozen = updates.frozen;

    await doc.save();
    res.json({ message: "Participant updated", participant: doc });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.finalizeParticipants = async (req, res) => {
  try {
    const schema = Joi.object({
      scope: Joi.string().valid("all", "school", "district").required(),
      eventId: Joi.string().allow(""),
      districtId: Joi.string().allow(""),
      schoolName: Joi.string().allow(""),
      freeze: Joi.boolean().required(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { scope, eventId, districtId, schoolName, freeze } = req.body;

    const ops = [];
    if (scope === "all" || scope === "school") {
      const filter = {};
      if (eventId) filter.eventId = eventId;
      if (districtId) filter.districtId = districtId;
      if (schoolName) filter.schoolName = schoolName;
      ops.push(Participant.updateMany(filter, { $set: { frozen: !!freeze } }));
    }
    if (scope === "all" || scope === "district") {
      const filter = {};
      if (eventId) filter.eventId = eventId;
      if (districtId) filter.districtId = districtId;
      ops.push(DistrictParticipant.updateMany(filter, { $set: { frozen: !!freeze } }));
    }

    await Promise.all(ops);
    res.json({ message: freeze ? "Participants frozen" : "Participants unfrozen" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
