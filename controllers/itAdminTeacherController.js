const Joi = require("joi");
const mongoose = require("mongoose");
const AccompanyingTeacher = require("../models/accompanyingTeacherModel");
const DistrictAccompanyingTeacher = require("../models/districtAccompanyingTeacherModel");

function buildFilters(query) {
  const { eventId, districtId, schoolName, q, present, frozen } = query || {};
  const base = {};
  if (eventId) base.eventId = eventId;
  if (districtId) base.districtId = districtId;
  if (typeof schoolName !== "undefined" && schoolName !== "") base.schoolName = schoolName;
  if (typeof present !== "undefined" && present !== "") base.present = String(present) === "true";
  if (typeof frozen !== "undefined" && frozen !== "") base.frozen = String(frozen) === "true";
  return { base, q: (q || "").trim().toLowerCase() };
}

exports.createTeacher = async (req, res) => {
  try {
    const schema = Joi.object({
      source: Joi.string().valid("school", "district").required(),
      name: Joi.string().required(),
      phone: Joi.string().allow(""),
      mobile: Joi.string().allow(""),
      gender: Joi.string().allow(""),
      member: Joi.string().allow(""),
      eventId: Joi.string().allow(""),
      districtId: Joi.string().when("source", { is: "school", then: Joi.required(), otherwise: Joi.required() }),
      schoolName: Joi.string().when("source", { is: "school", then: Joi.required(), otherwise: Joi.allow("") }),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { source, name, phone, mobile, gender, member, eventId, districtId, schoolName } = req.body;

    if (source === "school") {
        const exists = await AccompanyingTeacher.findOne({
    name,
    districtId,
    eventId,
    gender: (gender || "").toLowerCase(),
  });

  if (exists) {
    return res.status(400).json({
      message: "Duplicate teacher: Same name already exists in this event with same district & gender."
    });
  }
      const payload = {
        name,
        mobile: mobile || phone || "",
        gender: (gender || "").toLowerCase(),
        member,
        eventId: eventId || undefined,
        districtId,
        schoolName,
        createdBy: req.user.id,
      };
      const doc = await AccompanyingTeacher.create(payload);
      return res.status(201).json({ message: "Teacher added", teacher: doc });
    } else {
        // 🔥 Duplicate validation
      const exists = await DistrictAccompanyingTeacher.findOne({
        name,
        districtId,
        eventId,
        gender: (gender || "").toLowerCase(),
      });

      if (exists) {
        return res.status(400).json({
          message: "Duplicate teacher: Same name already exists in this event with same district & gender."
        });
      }
      const payload = {
        name,
        mobile: mobile || phone || "",
        gender: (gender || "").toLowerCase(),
        member,
        eventId: eventId || undefined,
        districtId,
        createdBy: req.user.id,
      };
      const doc = await DistrictAccompanyingTeacher.create(payload);
      return res.status(201).json({ message: "Teacher added", teacher: doc });
    }
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.listTeachers = async (req, res) => {
  try {
    const { scope = "all" } = req.query;
    const { base, q } = buildFilters(req.query);

    let presentFilter = undefined;
    if (typeof req.query.present !== 'undefined' && req.query.present !== '') {
      if (String(req.query.present) === 'true') presentFilter = { present: true };
      else presentFilter = { $or: [ { present: false }, { present: { $exists: false } } ] };
    }

    const matchText = (t) => {
      if (!q) return true;
      return (
        String(t.name || "").toLowerCase().includes(q) ||
        String(t.mobile || "").toLowerCase().includes(q)
      );
    };

    const results = [];
    if (scope === "all" || scope === "school") {
      const schoolBase = { ...base };
      const schoolQuery = presentFilter ? { $and: [ schoolBase, presentFilter ] } : schoolBase;
      const items = await AccompanyingTeacher.find(schoolQuery).lean();
      items.forEach((t) => { if (matchText(t)) results.push({ ...t, source: "school" }); });
    }
    if (scope === "all" || scope === "district") {
      const b = { ...base };
      delete b.schoolName;
      const distBase = b;
      const distQuery = presentFilter ? { $and: [ distBase, presentFilter ] } : distBase;
      const items = await DistrictAccompanyingTeacher.find(distQuery).lean();
      items.forEach((t) => { if (matchText(t)) results.push({ ...t, source: "district" }); });
    }

    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
    const isValid = (id) => typeof id === 'string' ? mongoose.Types.ObjectId.isValid(id) : mongoose.Types.ObjectId.isValid(String(id));
    const toIdStrings = (arr) => arr.map((v) => String(v)).filter((v) => mongoose.Types.ObjectId.isValid(v));
    const schoolEventIds = toIdStrings(uniq(results.filter(r => r.source === 'school').map(r => r.eventId)).filter(isValid));
    const districtEventIds = toIdStrings(uniq(results.filter(r => r.source === 'district').map(r => r.eventId)).filter(isValid));
    const districtIds = toIdStrings(uniq(results.map(r => r.districtId)).filter(isValid));

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
      phone: r.mobile,
      eventTitle: r.source === 'school' ? (evMap.get(String(r.eventId)) || '') : (devMap.get(String(r.eventId)) || ''),
      districtName: dMap.get(String(r.districtId)) || '',
    }));

    res.json(withNames);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    const schema = Joi.object({
      source: Joi.string().valid("school", "district").required(),
      updates: Joi.object({
        name: Joi.string().allow(""),
        mobile: Joi.string().allow(""),
        phone: Joi.string().allow(""),
        gender: Joi.string().allow(""),
        member: Joi.string().allow(""),
        eventId: Joi.string().allow(""),
        present: Joi.boolean(),
        frozen: Joi.boolean(),
      }).required(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { id } = req.params;
    const { source, updates } = req.body;

    const Model = source === "school" ? AccompanyingTeacher : DistrictAccompanyingTeacher;
    const doc = await Model.findById(id);
    if (!doc) return res.status(404).json({ message: "Teacher not found" });

    if (doc.frozen) {
      const updatesKeys = Object.keys(updates || {});
      const onlyToggleFrozen = updatesKeys.length === 1 && typeof updates.frozen !== 'undefined';
      if (!onlyToggleFrozen) return res.status(400).json({ message: "Cannot update a frozen record" });
    }

    if (typeof updates.name !== "undefined") doc.name = updates.name;
    if (typeof updates.mobile !== "undefined") doc.mobile = updates.mobile;
    if (typeof updates.phone !== "undefined") doc.mobile = updates.phone; // accept either key
    if (typeof updates.member !== "undefined") doc.member = updates.member;
    if (typeof updates.gender !== "undefined") doc.gender = (updates.gender || "").toLowerCase();
    if (typeof updates.present !== "undefined") doc.present = updates.present;
    if (typeof updates.eventId !== "undefined" && updates.eventId) doc.eventId = updates.eventId;
    if (typeof updates.frozen !== "undefined") doc.frozen = updates.frozen;

    await doc.save();
    res.json({ message: "Teacher updated", teacher: doc });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.deleteTeacher = async (req, res) => {
  try {
    const schema = Joi.object({
      source: Joi.string().valid("school", "district").required(),
    });

    const { error } = schema.validate(req.query); // ⬅ change req.body → req.query
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { id } = req.params;
    const { source } = req.query; // ⬅ from query instead of body

    const Model = source === "school" ? AccompanyingTeacher : DistrictAccompanyingTeacher;

    const doc = await Model.findById(id);
    if (!doc) return res.status(404).json({ message: "Teacher not found" });

    if (doc.frozen) {
      return res.status(400).json({ message: "Cannot delete a frozen record" });
    }

    await Model.findByIdAndDelete(id);

    res.json({ message: "Teacher deleted successfully" });

  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.finalizeTeachers = async (req, res) => {
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
      ops.push(AccompanyingTeacher.updateMany(filter, { $set: { frozen: !!freeze } }));
    }
    if (scope === "all" || scope === "district") {
      const filter = {};
      if (eventId) filter.eventId = eventId;
      if (districtId) filter.districtId = districtId;
      ops.push(DistrictAccompanyingTeacher.updateMany(filter, { $set: { frozen: !!freeze } }));
    }

    await Promise.all(ops);
    res.json({ message: freeze ? "Teachers frozen" : "Teachers unfrozen" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
