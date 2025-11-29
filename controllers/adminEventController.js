const Joi = require("joi");
const Event = require("../models/eventModel");

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

    const { title, audience } = req.body;

    // ---- Duplicate Check (Title + Audience must be unique)
    const exists = await Event.findOne({
      title: new RegExp(`^${title}\\s*$`, "i"),
      audience: audience || "both",
    });

    if (exists) {
      return res.status(409).json({
        message: "An event with the same title and audience already exists",
      });
    }

    // Create Event
    const doc = await Event.create({
      title: title.trim(),
      description: req.body.description || "",
      date: req.body.date ? new Date(req.body.date) : null,
      venue: req.body.venue || "",
      gender: req.body.gender || "both",
      audience: req.body.audience || "both",
      isGroupEvent: !!req.body.isGroupEvent,
      participantCount: req.body.isGroupEvent ? (req.body.participantCount || 2) : null,
    });

    res.status(201).json(doc);

  } catch (e) {
    if (e.code === 11000)
      return res.status(409).json({ message: "Duplicate event detected" });

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

    const { title, audience } = req.body;

    // ---- Duplicate Check (Title + Audience must be unique, excluding current ID)
    if (title) {
      const dup = await Event.findOne({
        _id: { $ne: req.params.id },
        title: new RegExp(`^${title}\\s*$`, "i"),
        audience: audience || req.body.audience || "both",
      });

      if (dup) {
        return res.status(409).json({
          message: "An event with the same title and audience already exists",
        });
      }
    }

    // Build update object
    const update = {};
    if (title !== undefined) update.title = title.trim();
    if (req.body.description !== undefined) update.description = req.body.description;
    if (req.body.date !== undefined) update.date = req.body.date ? new Date(req.body.date) : null;
    if (req.body.venue !== undefined) update.venue = req.body.venue;
    if (req.body.gender !== undefined) update.gender = req.body.gender;
    if (req.body.audience !== undefined) update.audience = req.body.audience;
    if (req.body.isGroupEvent !== undefined) update.isGroupEvent = !!req.body.isGroupEvent;
    if (req.body.participantCount !== undefined)
      update.participantCount = req.body.isGroupEvent ? req.body.participantCount : null;

    const saved = await Event.findByIdAndUpdate(req.params.id, update, { new: true });

    if (!saved) return res.status(404).json({ message: "Event not found" });

    res.json(saved);

  } catch (e) {
    if (e.code === 11000)
      return res.status(409).json({ message: "Duplicate event detected" });

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
