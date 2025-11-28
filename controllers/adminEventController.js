const Joi = require("joi");
const Event = require("../models/eventModel");
// Note: Admin creates school events by providing schoolName directly.

// Normalize title for duplicate checks
function normalizeTitle(t) {
  return String(t || "").trim().toLowerCase();
}

exports.list = async (req, res) => {
  try {
    const items = await Event.find().sort({ createdAt: -1 });
    res.json(items);
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
      audience: Joi.string().valid("junior", "senior", "both").optional(),
      isGroupEvent: Joi.boolean().optional(),
      participantCount: Joi.number().integer().min(2).allow(null).optional(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { title, description, date, venue, gender, audience, isGroupEvent, participantCount } = req.body;

    // Unique title (case-insensitive)
    const exists = await Event.findOne({ title: new RegExp(`^${title}\s*$`, "i") });
    if (exists) return res.status(409).json({ message: "Event title already exists" });

    const doc = await Event.create({
      title: title.trim(),
      description: description || "",
      date: date ? new Date(date) : null,
      venue: venue || "",
       gender: gender || "both",
      audience: audience || "both",
      isGroupEvent: !!isGroupEvent,
      participantCount: isGroupEvent ? (participantCount || 2) : null,
    });
    res.status(201).json(doc);
  } catch (e) {
    // handle unique index errors gracefully
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
      audience: Joi.string().valid("junior", "senior", "both").optional(),
      isGroupEvent: Joi.boolean().optional(),
      participantCount: Joi.number().integer().min(2).allow(null).optional(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const update = {};
    if (req.body.title != null) {
      const dup = await Event.findOne({ _id: { $ne: req.params.id }, title: new RegExp(`^${req.body.title}\s*$`, "i") });
      if (dup) return res.status(409).json({ message: "Event title already exists" });
      update.title = req.body.title.trim();
    }
    if (req.body.description !== undefined) update.description = req.body.description;
    if (req.body.date !== undefined) update.date = req.body.date ? new Date(req.body.date) : null;
    if (req.body.venue !== undefined) update.venue = req.body.venue;
     if (req.body.gender !== undefined) update.gender = req.body.gender;
    if (req.body.audience !== undefined) update.audience = req.body.audience;
    if (req.body.isGroupEvent !== undefined) update.isGroupEvent = !!req.body.isGroupEvent;
    if (req.body.participantCount !== undefined) update.participantCount = update.isGroupEvent ? req.body.participantCount : null;

    const saved = await Event.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!saved) return res.status(404).json({ message: "Event not found" });
    res.json(saved);
  } catch (e) {
    if (e && e.code === 11000) return res.status(409).json({ message: "Event title already exists" });
    res.status(500).json({ message: e.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const r = await Event.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ message: "Event not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
