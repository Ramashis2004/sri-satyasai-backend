const Joi = require("joi");
const Announcement = require("../models/announcementModel");

exports.list = async (req, res) => {
  try {
    const items = await Announcement.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.publicList = async (req, res) => {
  try {
    const items = await Announcement.find({})
      .sort({ createdAt: -1 })
      .select("title message type audience createdAt");
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.create = async (req, res) => {
  try {
    const schema = Joi.object({
      title: Joi.string().required(),
      message: Joi.string().required(),
      type: Joi.string().allow("", null),
      audience: Joi.string().allow("", null),
      isActive: Joi.boolean().optional(),
      expiresAt: Joi.date().allow(null),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const payload = {
      title: req.body.title.trim(),
      message: req.body.message,
      type: req.body.type || "update",
      audience: req.body.audience || "all",
      createdBy: req.user?._id || null,
      isActive: req.body.isActive !== undefined ? !!req.body.isActive : true,
      expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
    };
    const saved = await Announcement.create(payload);
    res.status(201).json(saved);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const schema = Joi.object({
      title: Joi.string().allow(""),
      message: Joi.string().allow(""),
      type: Joi.string().allow("", null),
      audience: Joi.string().allow("", null),
      isActive: Joi.boolean().optional(),
      expiresAt: Joi.date().allow(null),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const update = {};
    if (req.body.title !== undefined) update.title = req.body.title.trim();
    if (req.body.message !== undefined) update.message = req.body.message;
    if (req.body.type !== undefined) update.type = req.body.type || "update";
    if (req.body.audience !== undefined) update.audience = req.body.audience || "all";
    if (req.body.isActive !== undefined) update.isActive = !!req.body.isActive;
    if (req.body.expiresAt !== undefined) update.expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;

    const saved = await Announcement.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!saved) return res.status(404).json({ message: "Announcement not found" });
    res.json(saved);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const r = await Announcement.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ message: "Announcement not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
