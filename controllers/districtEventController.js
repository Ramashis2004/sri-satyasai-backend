const Joi = require("joi");
const DistrictEvent = require("../models/districtEventModel");

exports.list = async (req, res) => {
  try {
    const CULTURAL_EVENT_ID = "694599d2de9c7cb446c0034b";
    const items = await DistrictEvent.find().sort({ date: -1, createdAt: -1 });
    // Hide the special Cultural Programme from public/admin listings
    const visibleItems = items.filter(
      (ev) => String(ev._id) !== String(CULTURAL_EVENT_ID)
    );
    res.json(visibleItems);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.create = async (req, res) => {
  try {
    const schema = Joi.object({
      title: Joi.string().required(),
      description: Joi.string().allow(""),
      date: Joi.date().allow(null),
      venue: Joi.string().allow(""),
      gender: Joi.string().valid("boy", "girl", "both").optional(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const payload = {
      title: req.body.title.trim(),
      description: req.body.description || "",
      date: req.body.date ? new Date(req.body.date) : null,
      venue: req.body.venue || "",
      gender: req.body.gender || "both",
    };

    // unique title guard (case-insensitive)
    const dup = await DistrictEvent.findOne({ title: new RegExp(`^${payload.title}\\s*$`, "i") });
    if (dup) return res.status(409).json({ message: "Event title already exists" });

    const saved = await DistrictEvent.create(payload);
    res.status(201).json(saved);
  } catch (e) {
    if (e && e.code === 11000) return res.status(409).json({ message: "Event title already exists" });
    res.status(500).json({ message: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const schema = Joi.object({
      title: Joi.string().allow(""),
      description: Joi.string().allow(""),
      date: Joi.date().allow(null),
      venue: Joi.string().allow(""),
      gender: Joi.string().valid("boy", "girl", "both").optional(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const update = {};
    if (req.body.title != null) {
      const trimmed = req.body.title.trim();
      const dup = await DistrictEvent.findOne({ _id: { $ne: req.params.id }, title: new RegExp(`^${trimmed}\\s*$`, "i") });
      if (dup) return res.status(409).json({ message: "Event title already exists" });
      update.title = trimmed;
    }
    if (req.body.description !== undefined) update.description = req.body.description;
    if (req.body.date !== undefined) update.date = req.body.date ? new Date(req.body.date) : null;
    if (req.body.venue !== undefined) update.venue = req.body.venue;
    if (req.body.gender !== undefined) update.gender = req.body.gender;

    const saved = await DistrictEvent.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!saved) return res.status(404).json({ message: "Event not found" });
    res.json(saved);
  } catch (e) {
    if (e && e.code === 11000) return res.status(409).json({ message: "Event title already exists" });
    res.status(500).json({ message: e.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const r = await DistrictEvent.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ message: "Event not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
